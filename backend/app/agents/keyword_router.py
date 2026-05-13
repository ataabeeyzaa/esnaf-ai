"""Keyword-based zero-LLM router.

We try this BEFORE Gemini to keep the demo fast and reliable under free-tier
quota. When a query matches a recognized intent we call the tool directly
and return a templated Turkish reply through fallback_synth. Gemini is only
invoked for unrecognized / open-ended messages — which keeps the daily
request budget low and the user-facing latency near zero.
"""
from __future__ import annotations

import re
from typing import Any, Callable

from app.agents import tools as toolset


ORDER_ID_RE = re.compile(r"\b(\d{1,5})\b")
QUANTITY_RE = re.compile(r"\b(\d{1,3})\s*(kg|kilo|adet|tane|paket|kavanoz|şişe|sise|teneke|kova|li|lı)?\b", re.IGNORECASE)

# Words that signal "I want to ORDER/BUY" — distinguish from "where is my order"
PURCHASE_VERBS = [
    "satın al", "satin al", "almak istiy", "alabilir miyim", "isterim", "istiyorum",
    "sepete", "sepet", "sipariş ver", "siparis ver", "sipariş etmek", "siparis etmek",
    "alabilirim", "alabilirmiyim", "lütfen gönderin", "gönderin", "yolla",
]

STOPWORDS_STOCK = {
    "var", "mı", "mi", "mu", "mü", "stokta", "stoğu", "stogu", "stok", "kaldı",
    "kaldi", "mevcut", "hala", "hâlâ", "bende", "bizde", "sizde", "ürün", "urun",
    "ürünü", "urunu", "ürününüz", "ürünleri", "merhaba", "selam", "ben", "bana",
    "bir", "kaç", "kac", "tane", "kilo", "kg", "var", "mevcudiyeti", "duzeyi",
    "almak", "istiyorum", "isterim", "alabilirim", "satın", "satin",
    "siparis", "sipariş", "vermek", "ver", "lütfen", "lutfen", "rica",
    "ediyorum", "ederim", "ki", "de", "da", "ne", "nasıl", "nasil",
}

# Keep a synced list of product tokens — used for stock & purchase disambiguation
# Çok-kelimeli ürün ifadeleri — bunlar tek-kelime hint'lerden ÖNCE
# kontrol edilir, böylece "tulum peyniri" geldiğinde "peynir"in tek
# başına yakalanması yerine tam ifade yakalanır.
COMPOUND_PRODUCT_HINTS = [
    "tulum peyniri", "tulum peynir",
    "köy peyniri", "koy peyniri", "köy peynir", "koy peynir",
    "lor peyniri", "lor peynir",
    "köy balı", "koy bali", "köy bal", "koy bal",
    "köy yumurtası", "koy yumurtasi",
    "organik domates", "organik salatalık", "organik salatalik",
    "organik biber", "organik patlıcan", "organik patlican",
    "organik limon",
    "sızma zeytinyağı", "sizma zeytinyagi", "sızma zeytin yağı",
    "süzme tereyağı", "suzme tereyagi", "süzme tereyağ",
    "süzme yoğurt", "suzme yogurt",
    "çilek reçeli", "cilek receli",
    "vişne reçeli", "visne receli",
    "kayısı reçeli", "kayisi receli",
    "karışık turşu", "karisik tursu",
    "kuru fasulye", "kuru üzüm", "kuru uzum",
    "çiğ badem", "cig badem",
    "ceviz içi", "ceviz ici", "fındık içi", "findik ici",
    "siyah zeytin", "yeşil zeytin", "yesil zeytin",
    "karabaş çayı", "karabas cayi",
]

PRODUCT_HINTS = [
    "domates", "salatalık", "salatalik", "biber", "patlıcan", "patlican",
    "yumurta", "limon", "bal", "tereyağı", "tereyagi", "zeytinyağı",
    "zeytinyagi", "zeytin", "peynir", "yoğurt", "yogurt", "bulgur",
    "nohut", "fasulye", "mercimek", "reçel", "recel", "turşu", "tursu",
    "adaçayı", "adacayi", "ıhlamur", "ihlamur", "kekik", "badem",
    "ceviz", "fındık", "findik", "üzüm", "uzum",
    "süt", "sut", "lor", "tulum",
]


POSSESSIVE_SUFFIXES = ("im", "ım", "üm", "um", "lerim", "larım", "ları", "leri")


def _detect_product(msg: str) -> str | None:
    """Return the most specific product hint found in the message.

    Önce çok-kelimeli ifadelerde tam eşleşme aranır (örn. "tulum peyniri"
    "peynir"den önce). Bulunmazsa tek-kelime hint'lerine düşülür.
    """
    for compound in COMPOUND_PRODUCT_HINTS:
        if compound in msg:
            return compound
    for hint in PRODUCT_HINTS:
        if hint in msg:
            return hint
    return None


def _has_possessive_product(msg: str) -> bool:
    """True if a product is followed by a Turkish possessive suffix.
    e.g. 'domateslerim', 'sipariş-im hakkında balım'.
    """
    for hint in PRODUCT_HINTS:
        if hint in msg:
            # Find the word that contains the hint
            words = re.findall(r"\b[a-zA-Z0-9çÇğĞıİöÖşŞüÜ]+\b", msg)
            for w in words:
                lw = w.lower()
                if hint in lw and any(lw.endswith(suf) for suf in POSSESSIVE_SUFFIXES):
                    return True
    return False


def _detect_quantity(msg: str) -> int:
    """Best-effort quantity detection, defaults to 1."""
    m = QUANTITY_RE.search(msg)
    if not m:
        return 1
    # Don't confuse 4-5 digit order numbers with quantities (e.g. "1042 numaralı")
    n = int(m.group(1))
    if n > 99:
        return 1
    return max(1, n)

GREETING_REPLY = (
    "Merhaba 👋 Ben **Çırak**, kooperatifimizin yapay zeka çırağı. "
    "Size sipariş verme, sipariş takibi, ürün stokları veya kargo bilgisi konusunda yardımcı olabilirim. "
    "Örnek: \"3 kg domates almak istiyorum\" veya \"5 numaralı siparişim ne durumda?\""
)

HELP_REPLY = (
    "Size şu konularda yardımcı olabilirim:\n\n"
    "- 🛒 **Yeni sipariş verme:** \"3 kg organik domates istiyorum\"\n"
    "- 📦 **Sipariş durumu:** \"X numaralı siparişim ne durumda?\"\n"
    "- 🔍 **Stok sorgusu:** \"Köy balı stokta var mı?\"\n"
    "- 🚚 **Kargo takibi:** \"X numaralı kargom nerede?\"\n"
    "- ↩️ **İade & değişim:** Müşteri hizmetleri ekibimize yönlendirebilirim.\n\n"
    "Hangi konuda yardımcı olabilirim?"
)

RETURN_REPLY = (
    "İade ve değişim talepleriniz için kargo etiketinizi paylaştıktan sonra 3 iş günü "
    "içinde ürünü göndermeniz yeterlidir. Ücretsiz iade kargosu için tarafımıza dönüş "
    "yapabilir, sipariş numaranızla iade başlatabilirsiniz. Hangi siparişiniz için iade "
    "başlatmak istersiniz?"
)

NEW_PRODUCTS_REPLY = (
    "Bu hafta öne çıkan yeniliklerimiz:\n\n"
    "- 🍅 Yeni hasat **organik domates** (Yenidoğan kooperatifimizden)\n"
    "- 🍯 Sezonun ilk **akasya balı** (sınırlı stok!)\n"
    "- 🌿 Taze toplanmış **kekik ve adaçayı** paketleri\n"
    "- 🫒 Sızma zeytinyağı 5L tenekede (kampanya fiyatı)\n\n"
    "Detay istediğin bir ürün var mı?"
)


def _greeting(msg: str) -> bool:
    return any(k in msg for k in ["merhaba", "selam", "selamlar", "iyi günler", "iyi gunler", "günaydın", "gunaydin"]) and len(msg) < 40


def _help_request(msg: str) -> bool:
    return any(k in msg for k in ["yardım", "yardim", "ne yapabilir", "ne sorabil", "neler yap"])


def _return_request(msg: str) -> bool:
    return any(k in msg for k in ["iade", "değişim", "degisim", "geri ver"])


def _new_products_request(msg: str) -> bool:
    # "Bu hafta yeni ürün var mı?" vb. — "yeni ürün" / "yenilik" / "kampanya"
    # belirgin sinyaller. "bu hafta" tek başına yeterli değil: kullanıcı
    # "bu hafta en çok satan?" gibi top-seller sorgusu da yazıyor olabilir.
    return any(k in msg for k in ["yeni ürün", "yeni urun", "yenilik", "kampanya", "indirim", "fırsat", "firsat"])


def _top_sellers_request(msg: str) -> bool:
    return any(k in msg for k in ["en çok satan", "en cok satan", "best seller", "en popüler", "en populer", "çok tercih edilen", "cok tercih edilen"])


def _has_word(msg: str, words: list[str]) -> bool:
    return any(re.search(rf"\b{re.escape(w)}\b", msg) for w in words)


def route(message: str, audience: str) -> tuple[str, dict[str, Any]] | tuple[str, dict[str, Any], str] | None:
    """Return (tool_name, kwargs) or (CANNED, kwargs, reply_text), or None.

    CANNED responses don't need a tool call — synth layer will use the text.
    """
    msg = message.lower().strip()

    # "En çok satan" — works for both customers (recommendations) and owners (analytics).
    # Must come BEFORE the canned NEW_PRODUCTS_REPLY because "bu hafta en çok satan" used
    # to fall into the new-products bucket and ignore the real query.
    if _top_sellers_request(msg):
        return ("daily_briefing", {"focus": "top_sellers"})

    # Greetings / help / general info — canned replies, no tool needed
    if _greeting(msg):
        return ("__canned__", {}, GREETING_REPLY)
    if _help_request(msg):
        return ("__canned__", {}, HELP_REPLY)
    if _return_request(msg):
        return ("__canned__", {}, RETURN_REPLY)
    if _new_products_request(msg):
        return ("__canned__", {}, NEW_PRODUCTS_REPLY)

    # Owner-only patterns — order matters, BROADEST INTENT FIRST
    if audience == "owner":
        # Broad briefing/summary requests win — these often mention multiple
        # categories (kargo + stok + sipariş) in one sentence.
        if any(k in msg for k in ["brifing", "özet", "ozet", "bugün ne", "bugun ne", "ne durumdayız", "ne durumdayiz", "günlük rapor", "rapor", "sabah brifingi", "haftanın trendi", "haftanin trendi"]):
            return ("daily_briefing", {"focus": "general"})
        if any(k in msg for k in ["en çok satan", "en cok satan", "best seller", "popüler", "trend"]):
            return ("daily_briefing", {"focus": "top_sellers"})
        # Single-category intents only when the broad ones didn't match
        if any(k in msg for k in ["geciken kargo", "gecikmiş kargo", "gecikmiş", "geciken"]) and "brifing" not in msg and "özet" not in msg:
            return ("track_shipment", {"order_id": 0})
        if any(k in msg for k in ["kritik stok", "düşük stok", "dusuk stok", "azalan stok", "stoğu az"]) and "brifing" not in msg and "özet" not in msg:
            return ("check_stock", {"product_query": ""})

    # PURCHASE intent — user wants to BUY a product (highest priority for ambiguous queries)
    has_purchase = any(v in msg for v in PURCHASE_VERBS)
    has_product = _detect_product(msg) is not None
    has_order_id = ORDER_ID_RE.search(message) is not None

    if has_purchase and has_product:
        product = _detect_product(msg)
        qty = _detect_quantity(msg)
        return ("place_order", {"product_query": product, "quantity": qty})

    # Pure "sipariş vermek istiyorum" without a product specified
    if has_purchase and not has_product and not has_order_id:
        return (
            "__canned__",
            {},
            "Tabii ki, hangi üründen kaç adet/kg almak istersiniz? "
            "Örneğin: **\"3 kg organik domates istiyorum\"** veya **\"1 kavanoz köy balı\"** şeklinde söyleyebilirsiniz.\n\n"
            "Şu an stoktaki popüler ürünlerimiz: 🍅 organik domates, 🍯 köy balı, 🫒 sızma zeytinyağı, 🧀 köy peyniri, 🌿 kekik & adaçayı.",
        )

    # Order lookup — needs a numeric order id with order context
    if any(k in msg for k in ["sipariş", "siparis", "siparişim", "siparisim", "siparişin", "siparisin", "sipariş no", "siparis no"]):
        if has_order_id:
            return ("lookup_order", {"order_id": int(ORDER_ID_RE.search(message).group(1))})
        # Ambiguous: "siparişim nerede?" with no number but with a product → maybe they want to track a recent order
        if has_product:
            product = _detect_product(msg)
            return (
                "__canned__",
                {},
                f"{product.capitalize()} siparişiniz hakkında bilgi vermek için **sipariş numaranızı** paylaşır mısınız? "
                f"Yeni bir {product} siparişi vermek isterseniz \"3 kg {product} istiyorum\" gibi yazabilirsiniz.",
            )
        return (
            "__canned__",
            {},
            "Tabii ki, sipariş numaranızı paylaşır mısınız? Örneğin: \"5 numaralı siparişim ne durumda?\" şeklinde sorabilirsiniz. "
            "Yeni sipariş vermek isterseniz \"3 kg domates almak istiyorum\" gibi söyleyebilirsiniz.",
        )

    # Shipment tracking
    if any(k in msg for k in ["kargo", "teslim", "geldi mi", "ne zaman gelir", "ne zaman gelecek"]):
        m = ORDER_ID_RE.search(message)
        if m:
            return ("track_shipment", {"order_id": int(m.group(1))})
        return (
            "__canned__",
            {},
            "Kargonuzun durumunu kontrol etmek için sipariş numaranızı paylaşır mısınız?",
        )

    # Ambiguous: "domateslerim nerde kaldı" — possessive form + location word
    # Usually means "where is my X order" not "do you have X in stock"
    has_location = any(k in msg for k in ["nerede", "nerde", "ne durumda", "kaldı", "kaldi", "geldi", "gelecek"])
    if _has_possessive_product(msg) and has_location:
        product = _detect_product(msg) or ""
        return (
            "__canned__",
            {},
            f"Anladım, **{product}** içeren siparişinizden bahsediyorsunuz galiba. "
            f"Size doğru bilgiyi verebilmem için **sipariş numaranızı** paylaşır mısınız? "
            f"Örneğin: \"5 numaralı siparişim ne durumda?\" şeklinde sorabilirsiniz.\n\n"
            f"Eğer yeni bir {product} **sipariş vermek** istiyorsanız \"3 kg {product} almak istiyorum\" "
            f"diyebilirsiniz."
        )

    # Stock query — explicit stock keywords
    if any(k in msg for k in ["stok", "var mı", "var mi", "mevcut", "bulabilir", "satıyor", "satiyor"]):
        if has_product:
            return ("check_stock", {"product_query": _detect_product(msg)})
        words = re.findall(r"\b[a-zA-ZçÇğĞıİöÖşŞüÜ]+\b", msg)
        product_words = [w for w in words if w.lower() not in STOPWORDS_STOCK]
        query = " ".join(product_words).strip()
        if not query:
            return ("check_stock", {"product_query": ""})
        return ("check_stock", {"product_query": query})

    # Product mention without explicit "stok" word — fuzzy match common Turkish nouns
    hit = _detect_product(msg)
    if hit:
        return ("check_stock", {"product_query": hit})

    return None


def call_tool(tool_name: str, kwargs: dict[str, Any]) -> Any:
    """Execute a tool by name. Used by the offline / fast path."""
    if tool_name == "__canned__":
        return {"canned": True}
    fn: Callable[..., Any] | None = getattr(toolset, tool_name, None)
    if fn is None:
        return {"error": f"Tool {tool_name} not found"}
    try:
        return fn(**kwargs)
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}"}
