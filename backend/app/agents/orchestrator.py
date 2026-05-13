"""Gemini-powered orchestrator agent (manual function-calling loop).

We disable the SDK's automatic function calling so that we control every
network round-trip. This lets us retry transient 503/429 errors on each step
without re-executing tools, and surface clear traces of which tools fired.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Callable

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.agents.fallback_synth import synthesize_from_tools
from app.agents.keyword_router import call_tool as _kw_call, route as _kw_route
from app.agents.tools import CUSTOMER_TOOLS, OWNER_TOOLS
from app.config import settings


logger = logging.getLogger(__name__)


# Free-tier daily quotas vary. 2.5-flash-lite is the most generous as of
# 2026-05; we start there and fall back to other models when quotas/overload
# hit. Each model is tried fresh per request.
FALLBACK_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash",
]


CUSTOMER_SYSTEM_PROMPT = """Sen Çırak'sın — Türkiye'deki küçük ve orta ölçekli kooperatif/işletme
müşterileri için çalışan bir yapay zeka asistanısın ("Çırak", esnafın
yapay zeka çırağı). Müşterilerle sıcak, kibar ve anlaşılır Türkçe konuşursun.
Sadece yardımcı bilgi verirsin ve gerektiğinde aşağıdaki araçları kullanarak
gerçek verilere ulaşırsın.

Kurallar:
- Müşteri sipariş numarası verirse MUTLAKA `lookup_order` aracını çağır.
- Müşteri ürün/stok soruyorsa `check_stock` çağır.
- Müşteri kargo durumunu soruyorsa ve sipariş numarası verdiyse `track_shipment` çağır.
- Aracın döndürdüğü veriyi DOĞRU kabul et, asla "ulaşamıyorum" deme.
- Veriden okuduğun bilgiyi 2-4 cümlede özetle: durum, kargo, tahmini teslim, varsa gecikme.
- Para: TL. Tarihler: 12.05.2026 formatı.
- Cevaplar mesajlaşma diline uygun, kısa ve net olsun.
"""


OWNER_SYSTEM_PROMPT = """Sen Çırak'sın — bir KOBİ/kooperatif yöneticisi için çalışan operasyon
asistanısın. Yöneticiyle profesyonel, kısa ve veri-odaklı Türkçe konuşursun.

Kurallar:
- "Bugün ne var?", "brifing", "özet" denildiğinde MUTLAKA `daily_briefing` aracını çağır.
- "En çok satan" sorularında `daily_briefing(focus="top_sellers")` çağır.
- "Stoğu az olan", "kritik stok" sorularında `check_stock(product_query="")` çağır.
- "Gecikmiş kargo" sorularında `track_shipment(order_id=0)` çağır.
- "Tedarikçiye mail yaz" denirse önce `check_stock` ile ürünü bul, sonra `draft_supplier_email` çağır.
- Sayısal verileri madde madde ya da tabloyla sun. Markdown kullanabilirsin.
- Tool sonucundaki veriyi doğru say, asla "ulaşamıyorum" deme.
- Veriden çıkarsa içgörü ekle ("X ürünü son hafta çok arttı", "Y kategorisinde yoğunlaşma var").
"""


class Orchestrator:
    """Manual function-calling loop with per-call retries and model fallback."""

    MAX_TOOL_ROUNDS = 6  # safety cap on how many tool calls per user message

    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY tanımlı değil — .env dosyasını kontrol et.")
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.gemini_model

    def _call_gemini(
        self,
        model_name: str,
        contents: list[types.Content],
        system_prompt: str,
        tools_list: list[Callable[..., Any]],
    ) -> types.GenerateContentResponse:
        """Single Gemini call with disabled auto function calling."""
        return self.client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=tools_list,
                temperature=0.3,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
            ),
        )

    def _call_with_retry(
        self,
        contents: list[types.Content],
        system_prompt: str,
        tools_list: list[Callable[..., Any]],
    ) -> tuple[types.GenerateContentResponse | None, str | None]:
        """Try primary model, then fallbacks; retry transient errors."""
        models_to_try = [self.model] + [m for m in FALLBACK_MODELS if m != self.model]
        last_error: Exception | None = None
        for model_name in models_to_try:
            for attempt in range(2):
                try:
                    response = self._call_gemini(model_name, contents, system_prompt, tools_list)
                    return response, model_name
                except genai_errors.ServerError as e:
                    last_error = e
                    logger.warning("ServerError on %s (attempt %d): %s", model_name, attempt + 1, str(e)[:120])
                    time.sleep(1.5 + attempt)
                except genai_errors.ClientError as e:
                    last_error = e
                    msg = str(e).lower()
                    if "quota" in msg or "resource_exhausted" in msg or "429" in msg:
                        logger.warning("Quota exhausted on %s, falling back", model_name)
                        break
                    if "rate" in msg:
                        logger.warning("Rate limited on %s, retrying", model_name)
                        time.sleep(2.0)
                    else:
                        logger.exception("ClientError on %s", model_name)
                        break
                except Exception as e:  # noqa: BLE001
                    last_error = e
                    logger.exception("Unexpected error on %s", model_name)
                    break
        logger.error("All Gemini models failed: %s", last_error)
        return None, None

    def chat(
        self,
        message: str,
        audience: str = "customer",
        history: list[dict[str, str]] | None = None,
        extra_context: str | None = None,
        customer_phone: str | None = None,
        force_fast: bool = False,
    ) -> dict[str, Any]:
        system_prompt = CUSTOMER_SYSTEM_PROMPT if audience == "customer" else OWNER_SYSTEM_PROMPT
        if extra_context:
            system_prompt = f"{system_prompt}\n\nEk bağlam:\n{extra_context}"

        tools_list = CUSTOMER_TOOLS if audience == "customer" else OWNER_TOOLS
        tools_by_name = {t.__name__: t for t in tools_list}

        # FAST PATH — try keyword router first.
        # This makes the demo reliable under free-tier Gemini quotas and gives
        # sub-100ms responses for the common queries. The UI still surfaces the
        # tool name as a badge so the AI orchestration is visible.
        routed = _kw_route(message, audience)
        if routed is not None:
            # 3-tuple form means a canned reply text is included
            if len(routed) == 3:
                tool_name, kwargs, canned_text = routed  # type: ignore[misc]
                return {
                    "reply": canned_text,
                    "tools_used": [],
                    "model_used": "keyword_router",
                    "fallback": "keyword_canned",
                }
            tool_name, kwargs = routed  # type: ignore[misc]
            # Inject the authenticated customer phone so orders/lookups are
            # attributed to the right person. We only set it when the tool
            # actually accepts the field, otherwise it would surface as a
            # TypeError when called.
            if customer_phone and tool_name in {"place_order", "lookup_order"}:
                kwargs = {**kwargs, "customer_phone": customer_phone}
            result = _kw_call(tool_name, kwargs)
            tools_used_kw = [{"name": tool_name, "args": kwargs}]
            tool_results_kw = [{"name": tool_name, "args": kwargs, "result": result}]
            reply = synthesize_from_tools(tool_results_kw, audience)
            return {
                "reply": reply,
                "tools_used": tools_used_kw,
                "model_used": "keyword_router",
                "fallback": "keyword_route",
            }

        # FAST MODE — keyword router tarafında eşleşme bulamadık ve
        # arayan taraf "Gemini'yi atla" dedi. Token harcamadan generic
        # bir Türkçe yanıt döndür. Demo videosu çekilmeden önce saçma
        # sorulara nasıl tepki verdiğini test etmek için kullanılır.
        if force_fast:
            return {
                "reply": (
                    "Bu soruyu hızlı modda yanıtlayamadım — Gemini şu an devre dışı (token korunuyor). "
                    "Şunları sorabilirsin: bir sipariş numarası (örn. \"5 numaralı siparişim ne durumda?\"), "
                    "bir ürün adı (örn. \"köy balı stokta var mı?\") ya da \"yeni sipariş vermek istiyorum X\"."
                ),
                "tools_used": [],
                "model_used": "fast_mode",
                "fallback": "fast_mode_canned",
            }

        # SLOW PATH — open-ended question, ask Gemini.
        # Build initial contents from history + current message
        contents: list[types.Content] = []
        for turn in history or []:
            role = "user" if turn.get("role") == "user" else "model"
            text = turn.get("content", "")
            if not text:
                continue
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))
        contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

        tools_used: list[dict[str, Any]] = []

        # Collect tool results as we go — used for the offline fallback below.
        tool_results: list[dict[str, Any]] = []

        for _ in range(self.MAX_TOOL_ROUNDS):
            response, model_name = self._call_with_retry(contents, system_prompt, tools_list)
            if response is None:
                # Tier-1 fallback: we already called at least one tool; synth
                # a Turkish reply directly from results.
                if tool_results:
                    fallback_reply = synthesize_from_tools(tool_results, audience)
                    return {
                        "reply": fallback_reply,
                        "tools_used": tools_used,
                        "fallback": "synth_from_results",
                    }
                # Tier-2: Gemini totally failed AND no tool was called.
                # Keyword router already tried at the top, so emit a friendly
                # general-purpose response rather than the error message.
                return {
                    "reply": (
                        "Anladım, sorunuzu kaydettim. Şu an detaylı yanıt için "
                        "size sipariş numarası veya ürün adı bazlı bilgi sunabilirim. "
                        "Örneğin: \"5 numaralı siparişim ne durumda?\" ya da \"Köy balı stokta var mı?\" "
                        "şeklinde sorabilirsiniz."
                    ),
                    "tools_used": tools_used,
                    "fallback": "general_canned",
                }

            candidate = response.candidates[0] if response.candidates else None
            if candidate is None or candidate.content is None:
                break

            # Pull out function calls and text parts from this turn
            function_calls = [
                p.function_call for p in (candidate.content.parts or []) if getattr(p, "function_call", None)
            ]
            text_parts = [
                getattr(p, "text", "") for p in (candidate.content.parts or []) if getattr(p, "text", None)
            ]
            text_reply = "\n".join(t for t in text_parts if t).strip()

            if not function_calls:
                # Model is done — return final reply
                return {
                    "reply": text_reply or "Şu an için bir cevap üretemedim, tekrar dener misiniz?",
                    "tools_used": tools_used,
                    "model_used": model_name,
                }

            # Append the model's function-call message to the conversation
            contents.append(candidate.content)

            # Execute each function call and append a function_response part
            response_parts: list[types.Part] = []
            for fc in function_calls:
                fn = tools_by_name.get(fc.name)
                args = dict(fc.args or {})
                tools_used.append({"name": fc.name, "args": args})

                if fn is None:
                    logger.error("Unknown tool requested: %s", fc.name)
                    result = {"error": f"Tool {fc.name} not registered"}
                else:
                    try:
                        result = fn(**args)
                    except Exception as e:  # noqa: BLE001
                        logger.exception("Tool %s raised", fc.name)
                        result = {"error": f"{type(e).__name__}: {e}"}

                tool_results.append({"name": fc.name, "args": args, "result": result})
                # Gemini expects function_response with the result wrapped
                response_parts.append(
                    types.Part.from_function_response(name=fc.name, response={"result": result})
                )

            contents.append(types.Content(role="user", parts=response_parts))
            # Loop continues — next call lets model see the results and either
            # call more tools or produce the final text answer.

        # If we hit MAX_TOOL_ROUNDS without a final answer, return last seen text
        return {
            "reply": (
                "Veriler toplandı ancak özet üretilirken bir sorun oluştu. "
                "Lütfen sorunuzu biraz daha açar mısınız?"
            ),
            "tools_used": tools_used,
            "error": "max_rounds_reached",
        }


_orchestrator: Orchestrator | None = None


def get_orchestrator() -> Orchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator
