"""Müşteri tarafı uç noktaları — chat dışında müşterinin kendi panelinden
gördüğü veri (siparişleri, bildirimleri, aktif kampanyalar).

WhatsApp-tarzı chat sayfasının sol menüsündeki "Sipariş Bildirimi",
"Müşteri Hizmetleri" ve "Kampanyalar" sekmelerini besler.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.agents.tools import _fmt_dt, _order_status_tr, _shipment_dict
from app.db import get_db
from app.models import Customer, Order, OrderItem, OrderStatus, Product


router = APIRouter(prefix="/customer", tags=["customer"])


def _norm_phone(phone: str) -> str:
    return phone.replace(" ", "").replace("-", "")


@router.get("/notifications")
def customer_notifications(phone: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Müşterinin kendi siparişleri ve son durum güncellemeleri.

    Demo akışı: müşteri "Sipariş Bildirimi" sekmesine girer, kendi
    siparişlerinin nerede olduğunu, hangisinin gecikmede olduğunu
    görebilir. WhatsApp'taki "Resmi mesajlar" panelinin karşılığı.
    """
    phone_clean = _norm_phone(phone)
    customer = (
        db.query(Customer)
        .filter(func.replace(func.replace(Customer.phone, " ", ""), "-", "") == phone_clean)
        .first()
    )
    if customer is None:
        return {"customer": None, "items": []}

    orders = (
        db.query(Order)
        .options(selectinload(Order.items).joinedload(OrderItem.product), selectinload(Order.shipment))
        .filter(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
        .limit(8)
        .all()
    )

    items: list[dict[str, Any]] = []
    for o in orders:
        shipment = _shipment_dict(o.shipment)
        delayed = bool(shipment and shipment.get("delayed"))
        # Build a single short Turkish status line for the panel — same
        # tone Çırak would use in chat. No LLM call here; this is the
        # frame the customer sees before opening the conversation.
        if delayed:
            summary = f"⚠️ Sipariş #{o.id} kargosunda gecikme tespit edildi."
        elif o.status == OrderStatus.DELIVERED:
            summary = f"✅ Sipariş #{o.id} teslim edildi."
        elif o.status == OrderStatus.SHIPPED:
            summary = f"📦 Sipariş #{o.id} kargoya verildi."
        elif o.status == OrderStatus.PREPARING:
            summary = f"🛠 Sipariş #{o.id} hazırlanıyor."
        elif o.status == OrderStatus.CANCELLED:
            summary = f"⛔ Sipariş #{o.id} iptal edildi."
        else:
            summary = f"🕒 Sipariş #{o.id} onay bekliyor."

        items.append({
            "order_id": o.id,
            "status": _order_status_tr(o.status),
            "status_raw": o.status.value,
            "total": o.total,
            "item_count": len(o.items),
            "first_item": o.items[0].product.name if o.items else None,
            "created_at": _fmt_dt(o.created_at),
            "shipment_eta": shipment.get("eta") if shipment else None,
            "delayed": delayed,
            "summary": summary,
        })

    return {
        "customer": {"name": customer.name, "city": customer.city, "phone": customer.phone},
        "items": items,
        "generated_at": _fmt_dt(datetime.now(timezone.utc)),
    }


# Statik kampanya verisi — demo amaçlıdır, gerçek bir CMS veya
# tablo yerine in-process tutuluyor. Production'da bir `campaigns`
# tablosu (başlangıç/bitiş, indirim oranı, ürün filtresi) açılır.
_CAMPAIGNS: list[dict[str, Any]] = [
    {
        "id": "spring-2026",
        "title": "Bahar Fırsatları",
        "tagline": "Tüm taze ürünlerde %15 indirim",
        "emoji": "🌷",
        "valid_until": "31 Mayıs 2026",
        "cta_prompt": "Bahar fırsatlarından domates almak istiyorum",
        "tag": "Yeni",
    },
    {
        "id": "village-honey",
        "title": "Köy Balı Kampanyası",
        "tagline": "2 kavanoz alana 1 hediye",
        "emoji": "🍯",
        "valid_until": "20 Mayıs 2026",
        "cta_prompt": "Köy balı sipariş etmek istiyorum",
        "tag": "Sınırlı",
    },
    {
        "id": "first-order",
        "title": "İlk Sipariş Hediyesi",
        "tagline": "İlk siparişine kargo bedava",
        "emoji": "🚚",
        "valid_until": "Süresiz",
        "cta_prompt": "İlk siparişimi vermek istiyorum",
        "tag": "Hoşgeldin",
    },
]


@router.get("/campaigns")
def customer_campaigns() -> dict[str, Any]:
    """Aktif kampanyaların listesi."""
    return {"items": _CAMPAIGNS, "generated_at": _fmt_dt(datetime.now(timezone.utc))}


# Statik SSS — gerçek bir helpdesk arka planı yerine demo için
# yeterli, üstelik chat (Çırak) zaten dinamik cevap veriyor.
_FAQ: list[dict[str, str]] = [
    {
        "q": "Siparişim ne zaman teslim edilir?",
        "a": "İl içi 1-2 iş günü, il dışı 2-4 iş günü. Çırak'a sipariş numaranızla sorarsanız anlık durum verir.",
    },
    {
        "q": "Ürünleriniz organik mi?",
        "a": "Tarım kooperatifi olarak tüm sebze/meyve ve süt ürünlerimiz organik sertifikalıdır.",
    },
    {
        "q": "Sipariş iptali nasıl yapılır?",
        "a": "Kargoya verilmeden önce Çırak'a yazarak iptal edebilirsiniz. Kargoya verildiyse iade süreci başlar.",
    },
    {
        "q": "Toplu sipariş veya kurumsal alım yapıyor musunuz?",
        "a": "Evet, kooperatif yönetiminizle (info@cirak-demo.com) görüşebiliriz.",
    },
    {
        "q": "Ödeme yöntemleri neler?",
        "a": "Kapıda nakit, kapıda kart ve havale/EFT kabul ediyoruz. Online ödeme entegrasyonu yakında.",
    },
]

_CONTACT = {
    "hours": "Pazartesi - Cumartesi · 09:00 - 18:00",
    "phone": "+90 (366) 000 0000",
    "email": "info@cirak-demo.com",
    "address": "Kastamonu Tarım Kooperatifi · Merkez Şube",
}


@router.get("/help")
def customer_help() -> dict[str, Any]:
    """Müşteri hizmetleri panelinin içeriği: SSS + iletişim."""
    return {"faq": _FAQ, "contact": _CONTACT}


@router.get("/list")
def customer_list(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Demo'da hesap değiştirici için müşterilerin listesi.

    Production'da burası login + auth ile kapatılır; demo için herkesin
    arasında geçiş yapılabilsin diye public bırakıyorum.
    """
    customers = db.query(Customer).order_by(Customer.id).all()
    items: list[dict[str, Any]] = []
    for c in customers:
        # İlk iki harfin avatar olarak gösterimi için
        parts = c.name.split()
        initials = (parts[0][0] + (parts[-1][0] if len(parts) > 1 else "")).upper()
        items.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "city": c.city,
            "initials": initials[:2],
        })
    return {"items": items}
