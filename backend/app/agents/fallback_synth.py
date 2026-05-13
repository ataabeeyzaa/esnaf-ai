"""Deterministic Turkish response synthesizer used when Gemini is unavailable.

If the orchestrator successfully executes one or more tools but Gemini quota
runs out during the final synthesis call, we render a templated Turkish reply
directly from the tool results. The demo keeps working with real data even
when the LLM is completely offline.
"""
from __future__ import annotations

from typing import Any


def synthesize_from_tools(tool_results: list[dict[str, Any]], audience: str) -> str:
    """Build a Turkish reply from raw tool outputs without invoking any LLM."""
    if not tool_results:
        return "Şu an için bir sonuç üretemedim, lütfen tekrar dener misiniz?"

    parts: list[str] = []
    for tr in tool_results:
        name = tr.get("name", "")
        result = tr.get("result", {}) or {}
        if not isinstance(result, dict):
            continue
        if "error" in result:
            parts.append(f"⚠️ {result['error']}")
            continue

        rendered = _render_tool(name, result, audience)
        if rendered:
            parts.append(rendered)

    if not parts:
        return "Veriler getirildi ama özetleme şu an mümkün değil. Lütfen biraz sonra tekrar dener misiniz?"

    return "\n\n".join(parts)


def _render_tool(name: str, result: dict[str, Any], audience: str) -> str:
    """Per-tool renderer."""
    if name == "lookup_order":
        return _render_order(result, audience)
    if name == "check_stock":
        return _render_stock(result)
    if name == "track_shipment":
        return _render_shipment(result, audience)
    if name == "draft_supplier_email":
        return _render_supplier_email(result)
    if name == "daily_briefing":
        return _render_briefing(result)
    if name == "place_order":
        return _render_place_order(result)
    return ""


def _render_order(r: dict[str, Any], audience: str) -> str:
    items = r.get("items") or []
    items_line = ", ".join(
        f"{it.get('qty', 0)} {it.get('unit', '')} {it.get('product_name', '')}" for it in items
    )
    shipment = r.get("shipment") or {}
    lines = [
        f"📦 **{r.get('order_id')} numaralı siparişiniz** durumu: **{r.get('status_tr', r.get('status', '-'))}**.",
    ]
    if items_line:
        lines.append(f"İçeriği: {items_line}.")
    if shipment:
        carrier = shipment.get("carrier", "kargo")
        tracking = shipment.get("tracking_no", "")
        eta = shipment.get("eta")
        delayed = shipment.get("delayed", False)
        status_tr = shipment.get("status_tr", shipment.get("status", ""))
        sub = f"{carrier} ile {status_tr.lower()}"
        if tracking:
            sub += f" (takip no: `{tracking}`)"
        if eta:
            sub += f". Tahmini teslim: **{eta}**"
        if delayed:
            sub += " — ⚠️ küçük bir gecikme var, kargo merkezi yoğunluğu"
        lines.append(sub + ".")
    if audience == "owner":
        lines.append(f"Toplam: {r.get('total', 0):,.0f} ₺ · Müşteri: {r.get('customer_name', '-')}.")
    return "\n".join(lines)


def _render_stock(r: dict[str, Any]) -> str:
    results = r.get("results") or []
    if not results:
        return f"🔍 \"{r.get('query', '')}\" için eşleşen ürün bulamadım."
    if len(results) == 1:
        p = results[0]
        status = "kritik seviyede" if p.get("is_low") else "stokta"
        return (
            f"✅ **{p['name']}** {status}: **{p['stock']} {p['unit']}**. "
            f"Fiyat: {p['price']:.2f} ₺/{p['unit']}."
        )
    lines = [f"🔍 \"{r.get('query', '')}\" için {len(results)} ürün bulundu:"]
    for p in results[:8]:
        flag = "⚠️ kritik" if p.get("is_low") else "✅"
        lines.append(f"- {flag} **{p['name']}**: {p['stock']} {p['unit']} ({p['price']:.2f} ₺)")
    return "\n".join(lines)


def _render_shipment(r: dict[str, Any], audience: str) -> str:
    if "shipments" in r:  # bulk: track_shipment(0)
        shipments = r.get("shipments") or []
        count = r.get("delayed_count", len(shipments))
        if not count:
            return "🚚 Gecikme yaşayan kargo bulunmuyor — hepsi planlanan sürede."
        lines = [f"⚠️ **{count} kargo** gecikme uyarısında:"]
        for s in shipments[:8]:
            lines.append(
                f"- #{s.get('order_id')} · {s.get('customer_name', '')} · "
                f"{s.get('carrier', '')} · ETA: {s.get('eta', '-')} · `{s.get('tracking_no', '')}`"
            )
        return "\n".join(lines)

    # single
    status_tr = r.get("status_tr", r.get("status", "-"))
    eta = r.get("eta", "-")
    tracking = r.get("tracking_no", "")
    delayed = r.get("delayed", False)
    sub = f"🚚 #{r.get('order_id')} kargo durumu: **{status_tr}**, tahmini teslim: **{eta}** ({r.get('carrier', '')}, `{tracking}`)"
    if delayed:
        sub += ". ⚠️ Küçük bir gecikme tespit edildi."
    return sub


def _render_supplier_email(r: dict[str, Any]) -> str:
    return (
        f"✉️ **{r.get('product_name', '')}** için tedarikçi mail taslağı hazırlandı.\n\n"
        f"- **Mevcut stok:** {r.get('current_stock', '-')} {r.get('unit', '')}\n"
        f"- **Önerilen sipariş:** {r.get('suggested_qty', '-')} {r.get('unit', '')}\n"
        f"- **Son 14 gün satış:** {r.get('last_14_days_sales', '-')} {r.get('unit', '')}\n"
        f"- **Tedarikçi:** {r.get('supplier_name', '-')} · {r.get('supplier_email', '-')}\n\n"
        f"**Konu:** {r.get('subject', '')}\n\n"
        f"```\n{r.get('body', '')}\n```"
    )


def _render_place_order(r: dict[str, Any]) -> str:
    if r.get("error"):
        return f"⚠️ {r['error']}"
    ship = r.get("shipment") or {}
    return (
        f"🎉 **Siparişiniz alındı!**\n\n"
        f"- **Sipariş No:** #{r.get('order_id')}\n"
        f"- **Ürün:** {r.get('product_name')}\n"
        f"- **Miktar:** {r.get('quantity')} {r.get('unit')}\n"
        f"- **Birim Fiyat:** {r.get('unit_price', 0):.2f} ₺\n"
        f"- **Toplam:** **{r.get('total', 0):,.2f} ₺**\n"
        f"- **Durum:** {r.get('status_tr')}\n\n"
        f"📦 {ship.get('carrier', '')} ile gönderilecek — takip no `{ship.get('tracking_no', '')}`. "
        f"Tahmini teslim: **{ship.get('eta', '-')}**.\n\n"
        f"Daha başka bir ürün almak ister misiniz?"
    )


def _render_briefing(r: dict[str, Any]) -> str:
    today = r.get("today", {})
    ship = r.get("shipments", {})
    stock = r.get("stock", {})
    top = r.get("top_sellers_last_7_days", [])
    lines = [
        f"📊 **Bugün:** {today.get('orders', 0)} sipariş · {today.get('revenue', 0):,.0f} ₺ gelir.",
        f"🚚 **Kargo:** {ship.get('pending', 0)} yolda · {ship.get('delayed', 0)} gecikme.",
        f"📦 **Stok:** {stock.get('critical_count', 0)} ürün kritik seviyede.",
    ]
    if top:
        names = ", ".join(f"{p['name']} ({p['qty']} {p['unit']})" for p in top[:5])
        lines.append(f"🔝 **Top 5 (son 7 gün):** {names}.")
    return "\n\n".join(lines)
