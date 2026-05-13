"""Tool functions exposed to the Gemini orchestrator agent.

Each tool is a plain Python function with:
- typed parameters (SDK uses these for JSON schema)
- a Google-style docstring (SDK uses this for tool description)
- a JSON-serializable return value

The SDK detects these automatically when passed via `tools=[...]`.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.db import SessionLocal
from app.models import (
    Customer,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    Shipment,
    ShipmentStatus,
    StockAlert,
)


def _fmt_dt(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%d.%m.%Y %H:%M")


# Re-export for dashboard route (avoids duplicating the helper there).
__all__ = ["lookup_order", "check_stock", "track_shipment", "place_order",
           "draft_supplier_email", "daily_briefing", "_fmt_dt",
           "_order_status_tr", "_shipment_dict"]


def _shipment_dict(shipment: Shipment | None) -> dict[str, Any] | None:
    if shipment is None:
        return None
    return {
        "carrier": shipment.carrier,
        "tracking_no": shipment.tracking_no,
        "status": shipment.status.value,
        "status_tr": _ship_status_tr(shipment.status),
        "last_update": _fmt_dt(shipment.last_update),
        "eta": _fmt_dt(shipment.eta),
        "delayed": shipment.delayed,
        "notes": shipment.notes,
    }


def _ship_status_tr(s: ShipmentStatus) -> str:
    return {
        ShipmentStatus.LABEL_CREATED: "Kargo etiketi oluşturuldu, henüz teslim alınmadı",
        ShipmentStatus.PICKED_UP: "Kargo şubesine teslim edildi",
        ShipmentStatus.IN_TRANSIT: "Kargo yolda",
        ShipmentStatus.OUT_FOR_DELIVERY: "Dağıtıma çıktı",
        ShipmentStatus.DELIVERED: "Teslim edildi",
        ShipmentStatus.EXCEPTION: "Kargo sorunu var",
    }[s]


def _order_status_tr(s: OrderStatus) -> str:
    return {
        OrderStatus.PENDING: "Onay bekliyor",
        OrderStatus.PREPARING: "Hazırlanıyor",
        OrderStatus.SHIPPED: "Kargoya verildi",
        OrderStatus.DELIVERED: "Teslim edildi",
        OrderStatus.CANCELLED: "İptal edildi",
    }[s]


def lookup_order(order_id: int, customer_phone: str | None = None) -> dict[str, Any]:
    """Bir siparişin tüm detaylarını getirir: ürünler, durum, kargo bilgisi.

    Müşteri "siparişim nerede?", "X numaralı siparişim ne durumda?" gibi
    sorduğunda bu aracı çağır. customer_phone verilirse siparişin o müşteriye
    ait olup olmadığını doğrular (müşteri güvenliği için).

    Args:
        order_id: Sipariş numarası (ör. 1042).
        customer_phone: Opsiyonel müşteri telefonu. Verilirse doğrulama yapılır.

    Returns:
        Siparişin tüm bilgileri (müşteri adı, ürünler, durum, kargo).
        Sipariş bulunamazsa veya müşteriye ait değilse hata mesajı döner.
    """
    db: Session = SessionLocal()
    try:
        order = (
            db.query(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product))
            .options(selectinload(Order.customer))
            .options(selectinload(Order.shipment))
            .filter(Order.id == order_id)
            .first()
        )
        if order is None:
            return {"error": f"{order_id} numaralı sipariş bulunamadı."}
        if customer_phone and order.customer.phone.replace(" ", "") != customer_phone.replace(" ", ""):
            return {"error": "Bu sipariş numarası verilen telefonla eşleşmiyor."}

        return {
            "order_id": order.id,
            "customer_name": order.customer.name,
            "customer_city": order.customer.city,
            "status": order.status.value,
            "status_tr": _order_status_tr(order.status),
            "total": order.total,
            "created_at": _fmt_dt(order.created_at),
            "items": [
                {
                    "product_name": it.product.name,
                    "qty": it.qty,
                    "unit": it.product.unit,
                    "unit_price": it.unit_price,
                    "subtotal": round(it.qty * it.unit_price, 2),
                }
                for it in order.items
            ],
            "shipment": _shipment_dict(order.shipment),
        }
    finally:
        db.close()


def check_stock(product_query: str) -> dict[str, Any]:
    """Bir ürünün stok durumunu sorgular. Ürün adıyla bulanık arama yapar.

    Müşteri "X ürünü var mı?", "domates kaldı mı?" diye sorarsa kullan.
    İşletmeci "stoğu az olan ürünleri listele" derse kategori ile çağırabilirsin.

    Args:
        product_query: Ürün adı veya kategorisi (örn. "domates", "zeytinyağı",
                       "süt", "bakliyat"). Boş string verilirse tüm kritik
                       stoktaki ürünleri döner.

    Returns:
        Eşleşen ürünlerin stok bilgisi (stok adedi, eşik, durum).
    """
    db: Session = SessionLocal()
    try:
        if not product_query.strip():
            products = db.query(Product).all()
            low = [p for p in products if p.is_low_stock]
            return {
                "query": "(tümü - kritik stok)",
                "results": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "category": p.category,
                        "stock": p.stock,
                        "unit": p.unit,
                        "low_stock_threshold": p.low_stock_threshold,
                        "is_low": True,
                        "price": p.price,
                    }
                    for p in low
                ],
                "count": len(low),
            }

        # Token-tabanlı arama — çok kelimeli sorguda en çok eşleşen önce
        tokens = [t for t in product_query.lower().split() if len(t) >= 3]
        if tokens:
            all_products = db.query(Product).all()

            def kscore(p: Product) -> int:
                name = p.name.lower()
                cat = p.category.lower()
                return sum(1 for t in tokens if t in name or t in cat)

            ranked = [(kscore(p), p) for p in all_products]
            ranked = [(s, p) for s, p in ranked if s >= 1]
            ranked.sort(key=lambda x: x[0], reverse=True)
            products = [p for _, p in ranked[:10]]
        else:
            products = []
        if not products:
            # Fallback to single LIKE
            like = f"%{product_query.lower()}%"
            products = (
                db.query(Product)
                .filter(
                    or_(
                        func.lower(Product.name).like(like),
                        func.lower(Product.category).like(like),
                        func.lower(Product.sku).like(like),
                    )
                )
                .limit(10)
                .all()
            )
        return {
            "query": product_query,
            "results": [
                {
                    "id": p.id,
                    "name": p.name,
                    "category": p.category,
                    "stock": p.stock,
                    "unit": p.unit,
                    "low_stock_threshold": p.low_stock_threshold,
                    "is_low": p.is_low_stock,
                    "price": p.price,
                }
                for p in products
            ],
            "count": len(products),
        }
    finally:
        db.close()


def track_shipment(order_id: int) -> dict[str, Any]:
    """Bir siparişin kargo durumunu detaylı sorgular: gecikme, tahmini teslim.

    Müşteri "kargom nerede?", "ne zaman gelir?" diye sorarsa kullan.
    İşletmeci "gecikmiş kargoları göster" derse `order_id=0` ile çağır;
    bu durumda tüm geciken kargoların listesi döner.

    Args:
        order_id: Sipariş numarası. 0 verilirse tüm geciken kargolar listelenir.

    Returns:
        Kargo durumu, taşıyıcı, takip no, son güncelleme, ETA, gecikme bayrağı.
    """
    db: Session = SessionLocal()
    try:
        if order_id == 0:
            delayed = (
                db.query(Shipment)
                .options(selectinload(Shipment.order).selectinload(Order.customer))
                .filter(Shipment.delayed.is_(True))
                .all()
            )
            return {
                "delayed_count": len(delayed),
                "shipments": [
                    {
                        "order_id": s.order_id,
                        "customer_name": s.order.customer.name,
                        "customer_phone": s.order.customer.phone,
                        **(_shipment_dict(s) or {}),
                    }
                    for s in delayed
                ],
            }

        shipment = (
            db.query(Shipment)
            .options(selectinload(Shipment.order).selectinload(Order.customer))
            .filter(Shipment.order_id == order_id)
            .first()
        )
        if shipment is None:
            return {"error": f"{order_id} numaralı sipariş için kargo kaydı yok."}
        result = _shipment_dict(shipment) or {}
        result["order_id"] = shipment.order_id
        result["customer_name"] = shipment.order.customer.name
        return result
    finally:
        db.close()


def draft_supplier_email(product_id: int, suggested_qty: int | None = None) -> dict[str, Any]:
    """Bir ürün için tedarikçiye gönderilecek sipariş mail taslağını hazırlar.

    Stok azaldığında işletmeci "tedarikçiye mail yaz" derse bu aracı kullan.
    suggested_qty verilmezse, son 14 günlük satış verisine bakarak 2 haftalık
    ihtiyacı otomatik tahmin eder.

    Args:
        product_id: Ürün ID.
        suggested_qty: Sipariş edilmesi önerilen miktar. Verilmezse otomatik
                       hesaplanır.

    Returns:
        Tedarikçi adı/maili, konu, mail gövdesi (Türkçe), önerilen miktar,
        son 14 gün satış geçmişi.
    """
    db: Session = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product is None:
            return {"error": f"{product_id} ID'li ürün bulunamadı."}

        # Son 14 gün satış
        cutoff = datetime.now(timezone.utc) - timedelta(days=14)
        sold = (
            db.query(func.coalesce(func.sum(OrderItem.qty), 0))
            .join(Order, Order.id == OrderItem.order_id)
            .filter(OrderItem.product_id == product_id)
            .filter(Order.created_at >= cutoff)
            .scalar()
            or 0
        )

        if suggested_qty is None:
            # 2 haftalık güvenlik stoğu öner
            suggested_qty = max(int(sold * 1.5), product.low_stock_threshold * 3, 20)

        subject = f"[Sipariş Talebi] {product.name} — {suggested_qty} {product.unit}"
        body = (
            f"Sayın {product.supplier_name},\n\n"
            f"Stok durumumuz son seviyeye ulaştığı için aşağıdaki ürünü acil olarak sipariş etmek istiyoruz:\n\n"
            f"  Ürün     : {product.name}\n"
            f"  Kod (SKU): {product.sku}\n"
            f"  Mevcut Stok: {product.stock} {product.unit}\n"
            f"  Talep Edilen: {suggested_qty} {product.unit}\n"
            f"  Birim Referans Fiyat: {product.price:.2f} TL\n\n"
            f"Son 14 günde {sold} {product.unit} satış gerçekleştirdik; bu nedenle yukarıdaki miktar "
            f"yaklaşık iki haftalık ihtiyacımızı karşılayacaktır.\n\n"
            f"Mümkün olan en yakın teslim tarihini ve güncel fiyatı paylaşabilirseniz seviniriz.\n\n"
            f"Saygılarımla,\n"
            f"Çırak · Satınalma Asistanı\n"
        )

        return {
            "product_id": product.id,
            "product_name": product.name,
            "current_stock": product.stock,
            "unit": product.unit,
            "last_14_days_sales": sold,
            "suggested_qty": suggested_qty,
            "supplier_name": product.supplier_name,
            "supplier_email": product.supplier_email,
            "subject": subject,
            "body": body,
        }
    finally:
        db.close()


def daily_briefing(focus: str = "general") -> dict[str, Any]:
    """İşletmeci için günlük/haftalık operasyon özetini üretir.

    İşletmeci "sabah brifingi", "bugün ne durumda?", "bu hafta en çok satan?"
    derse kullan.

    Args:
        focus: "general" (varsayılan) günlük tam özet,
               "top_sellers" en çok satanlar,
               "alerts" sadece uyarılar.

    Returns:
        Bugünkü sipariş sayısı, gelir, geciken kargolar, kritik stoklar,
        son 7 günün en çok satan 5 ürünü, kısa Türkçe özet metni.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)

        orders_today = db.query(Order).filter(Order.created_at >= today_start).count()
        revenue_today = (
            db.query(func.coalesce(func.sum(Order.total), 0.0))
            .filter(Order.created_at >= today_start)
            .scalar()
            or 0.0
        )
        pending_shipments = db.query(Shipment).filter(
            Shipment.status.in_([ShipmentStatus.LABEL_CREATED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY])
        ).count()
        delayed_shipments = db.query(Shipment).filter(Shipment.delayed.is_(True)).count()

        low_stock = db.query(Product).all()
        critical = [p for p in low_stock if p.is_low_stock]

        # Top 5 sellers, last 7 days
        top_query = (
            db.query(
                Product.id,
                Product.name,
                Product.unit,
                func.sum(OrderItem.qty).label("total_qty"),
                func.sum(OrderItem.qty * OrderItem.unit_price).label("revenue"),
            )
            .join(OrderItem, OrderItem.product_id == Product.id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.created_at >= week_start)
            .group_by(Product.id, Product.name, Product.unit)
            .order_by(func.sum(OrderItem.qty).desc())
            .limit(5)
            .all()
        )
        top_sellers = [
            {"product_id": r.id, "name": r.name, "qty": int(r.total_qty), "unit": r.unit, "revenue": round(float(r.revenue), 2)}
            for r in top_query
        ]

        critical_brief = [
            {"product_id": p.id, "name": p.name, "stock": p.stock, "unit": p.unit, "threshold": p.low_stock_threshold}
            for p in critical
        ]

        return {
            "focus": focus,
            "today": {
                "orders": orders_today,
                "revenue": round(float(revenue_today), 2),
            },
            "shipments": {
                "pending": pending_shipments,
                "delayed": delayed_shipments,
            },
            "stock": {
                "critical_count": len(critical),
                "critical_products": critical_brief,
            },
            "top_sellers_last_7_days": top_sellers,
            "generated_at": _fmt_dt(now),
        }
    finally:
        db.close()


def place_order(
    product_query: str,
    quantity: int = 1,
    customer_phone: str | None = None,
) -> dict[str, Any]:
    """Müşteri için yeni bir sipariş oluşturur ve DB'ye kaydeder.

    Müşteri "satın almak istiyorum", "sipariş vermek istiyorum", "sepete ekle"
    gibi ifadelerle ürün almak istediğinde bu aracı çağır. Ürün adıyla bulanık
    arama yapar, ilk eşleşeni kullanır, kargo etiketi oluşturur.

    Args:
        product_query: Ürün adı veya kategorisi (örn. "organik domates", "bal").
        quantity: Sipariş miktarı (varsayılan 1).
        customer_phone: Sipariş veren müşterinin telefonu. Yoksa "demo" hesabı kullanılır.

    Returns:
        Oluşturulan siparişin ID'si, ürün, miktar, toplam tutar ve kargo bilgisi.
    """
    db: Session = SessionLocal()
    try:
        if quantity < 1:
            quantity = 1
        if quantity > 50:
            return {"error": "Tek seferde en fazla 50 adet sipariş verebilirsiniz."}

        # Token-tabanlı skorlama: müşteri "tulum peynir" derse "Tulum Peyniri"
        # "Köy Peyniri"nden daha çok puan almalı. Önce kullanıcı sorgusunu
        # kelimelere böl, her ürün için kaç kelimenin eşleştiğini say.
        tokens = [t for t in product_query.lower().split() if len(t) >= 3]
        all_products = db.query(Product).all()

        def score(p: Product) -> tuple[int, int]:
            name = p.name.lower()
            cat = p.category.lower()
            matched = sum(1 for t in tokens if t in name or t in cat)
            # İkinci kriter: stok dolu olan ürünler önce gelsin
            return (matched, p.stock)

        if tokens:
            ranked = sorted(all_products, key=score, reverse=True)
            best = ranked[0]
            best_score = sum(1 for t in tokens if t in best.name.lower() or t in best.category.lower())
            product = best if best_score >= 1 else None
        else:
            product = None
        if product is None:
            # Fallback: eski tek-LIKE davranışı
            like = f"%{product_query.lower()}%"
            product = (
                db.query(Product)
                .filter(
                    or_(
                        func.lower(Product.name).like(like),
                        func.lower(Product.category).like(like),
                    )
                )
                .first()
            )
        if product is None:
            return {"error": f"\"{product_query}\" için ürün bulunamadı."}
        if product.stock < quantity:
            return {
                "error": (
                    f"Üzgünüz, {product.name} stoğunda yeterli ürün yok "
                    f"({product.stock} {product.unit} kaldı, siz {quantity} {product.unit} istediniz)."
                ),
                "product_name": product.name,
                "available_stock": product.stock,
                "unit": product.unit,
            }

        # Find or create the customer
        customer: Customer | None = None
        if customer_phone:
            phone_clean = customer_phone.replace(" ", "")
            customer = (
                db.query(Customer)
                .filter(func.replace(Customer.phone, " ", "") == phone_clean)
                .first()
            )
        if customer is None:
            customer = db.query(Customer).order_by(Customer.id).first()
        if customer is None:
            return {"error": "Sistemde müşteri kaydı bulunamadı."}

        unit_price = product.price
        total = round(quantity * unit_price, 2)

        order = Order(
            customer_id=customer.id,
            status=OrderStatus.PENDING,
            total=total,
            notes=f"AI üzerinden oluşturuldu — {product.name}",
        )
        db.add(order)
        db.flush()

        item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            qty=quantity,
            unit_price=unit_price,
        )
        db.add(item)

        # Decrement stock
        product.stock -= quantity

        # Create a pending shipment
        import random as _r
        carrier = _r.choice(["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo"])
        prefix = {"Yurtiçi Kargo": "YK", "Aras Kargo": "AR", "MNG Kargo": "MN", "PTT Kargo": "PT"}[carrier]
        tracking = f"{prefix}{_r.randint(10000000, 99999999)}"
        eta = datetime.now(timezone.utc) + timedelta(days=_r.randint(2, 4))

        shipment = Shipment(
            order_id=order.id,
            carrier=carrier,
            tracking_no=tracking,
            status=ShipmentStatus.LABEL_CREATED,
            eta=eta,
            last_update=datetime.now(timezone.utc),
        )
        db.add(shipment)
        db.commit()
        db.refresh(order)

        return {
            "success": True,
            "order_id": order.id,
            "customer_name": customer.name,
            "product_name": product.name,
            "quantity": quantity,
            "unit": product.unit,
            "unit_price": unit_price,
            "total": total,
            "status_tr": "Onay bekliyor",
            "shipment": {
                "carrier": carrier,
                "tracking_no": tracking,
                "eta": _fmt_dt(eta),
                "status_tr": "Kargo etiketi oluşturuldu, henüz teslim alınmadı",
            },
            "remaining_stock": product.stock,
        }
    finally:
        db.close()


CUSTOMER_TOOLS = [lookup_order, check_stock, track_shipment, place_order]
OWNER_TOOLS = [lookup_order, check_stock, track_shipment, place_order, draft_supplier_email, daily_briefing]
ALL_TOOLS = OWNER_TOOLS  # backward-compat alias
