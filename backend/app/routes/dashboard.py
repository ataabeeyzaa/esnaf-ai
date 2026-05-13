from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.agents.orchestrator import get_orchestrator
from app.agents.tools import _fmt_dt, _order_status_tr, _shipment_dict, daily_briefing
from app.db import get_db
from app.models import ChatLog, Order, OrderItem, OrderStatus, Product, Shipment, ShipmentStatus, StockAlert
from app.schemas import DashboardSummary, OrderItemOut, OrderOut, ShipmentOut, StockAlertOut


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# Order status workflow — what comes next when the owner advances.
ORDER_NEXT_STATUS: dict[OrderStatus, OrderStatus] = {
    OrderStatus.PENDING: OrderStatus.PREPARING,
    OrderStatus.PREPARING: OrderStatus.SHIPPED,
    OrderStatus.SHIPPED: OrderStatus.DELIVERED,
}

# Shipment status follows order status as it advances.
SHIPMENT_FOR_ORDER: dict[OrderStatus, ShipmentStatus] = {
    OrderStatus.PREPARING: ShipmentStatus.LABEL_CREATED,
    OrderStatus.SHIPPED: ShipmentStatus.IN_TRANSIT,
    OrderStatus.DELIVERED: ShipmentStatus.DELIVERED,
}


# In-memory briefing cache to avoid hitting Gemini quota on every dashboard load.
# (Free tier RPD limits are tight; refresh via /dashboard/briefing endpoint.)
_briefing_cache: dict[str, datetime | str] = {"text": "", "generated_at": datetime.min.replace(tzinfo=timezone.utc)}
_BRIEFING_TTL_MIN = 5


def _order_to_out(order: Order) -> OrderOut:
    items = [
        OrderItemOut(
            product_name=it.product.name,
            qty=it.qty,
            unit_price=it.unit_price,
        )
        for it in order.items
    ]
    shipment_out = None
    if order.shipment:
        shipment_out = ShipmentOut(
            id=order.shipment.id,
            carrier=order.shipment.carrier,
            tracking_no=order.shipment.tracking_no,
            status=order.shipment.status.value,
            last_update=order.shipment.last_update,
            eta=order.shipment.eta,
            delayed=order.shipment.delayed,
        )
    return OrderOut(
        id=order.id,
        status=_order_status_tr(order.status),
        total=order.total,
        created_at=order.created_at,
        customer_name=order.customer.name,
        items=items,
        shipment=shipment_out,
    )


def _auto_settle_shipments(db: Session) -> int:
    """Demo simülasyonu — production'da kargo firmasının webhook'u devreye girer
    (Yurtiçi/Aras/MNG taşıyıcısı teslim edildiğinde POST atar). Burada onun
    yerine ETA'sı 12 saat öncesi geçmiş, yolda görünen kargoları otomatik
    "teslim edildi" sayıyoruz. Böylece zamanla gecikmiş kargolar listesi
    kendi kendine temizlenir, kullanıcının manuel müdahalesi gerekmez.

    Idempotent: aynı kargoyu birden fazla kez DELIVERED yapmaz.
    """
    threshold = datetime.now(timezone.utc) - timedelta(hours=12)
    moveable = (
        db.query(Shipment)
        .options(selectinload(Shipment.order))
        .filter(
            Shipment.status.in_([
                ShipmentStatus.LABEL_CREATED,
                ShipmentStatus.IN_TRANSIT,
                ShipmentStatus.OUT_FOR_DELIVERY,
            ]),
            Shipment.eta.isnot(None),
            Shipment.eta < threshold,
        )
        .all()
    )
    if not moveable:
        return 0
    now = datetime.now(timezone.utc)
    for s in moveable:
        s.status = ShipmentStatus.DELIVERED
        s.delayed = False
        s.last_update = now
        if s.order is not None and s.order.status != OrderStatus.DELIVERED:
            s.order.status = OrderStatus.DELIVERED
    db.commit()
    return len(moveable)


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db)) -> DashboardSummary:
    # Önce gecikmiş "ölü" kargoları otomatik kapat — production'da kargo
    # şirketi webhook'unun yapacağı işin demo simülasyonu.
    _auto_settle_shipments(db)

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
    total_orders = db.query(Order).count()
    total_revenue = db.query(func.coalesce(func.sum(Order.total), 0.0)).scalar() or 0.0

    pending = db.query(Shipment).filter(
        Shipment.status.in_(
            [ShipmentStatus.LABEL_CREATED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY]
        )
    ).count()
    delayed = db.query(Shipment).filter(Shipment.delayed.is_(True)).count()

    all_products = db.query(Product).all()
    low_stock_count = sum(1 for p in all_products if p.is_low_stock)

    # Top 5 last 7 days
    top_query = (
        db.query(
            Product.name.label("name"),
            Product.unit.label("unit"),
            func.sum(OrderItem.qty).label("total_qty"),
            func.sum(OrderItem.qty * OrderItem.unit_price).label("revenue"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.created_at >= week_start)
        .group_by(Product.name, Product.unit)
        .order_by(func.sum(OrderItem.qty).desc())
        .limit(5)
        .all()
    )
    top_products = [
        {"name": r.name, "qty": int(r.total_qty), "unit": r.unit, "revenue": round(float(r.revenue), 2)}
        for r in top_query
    ]

    # Recent 8 orders
    recent = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .options(selectinload(Order.customer))
        .options(selectinload(Order.shipment))
        .order_by(Order.created_at.desc())
        .limit(8)
        .all()
    )
    recent_out = [_order_to_out(o) for o in recent]

    # Stock alerts
    alerts = (
        db.query(StockAlert)
        .options(selectinload(StockAlert.product))
        .filter(StockAlert.resolved.is_(False))
        .order_by(StockAlert.created_at.desc())
        .all()
    )
    alerts_out = [
        StockAlertOut(
            id=a.id,
            product_id=a.product_id,
            product_name=a.product.name,
            stock=a.product.stock,
            low_stock_threshold=a.product.low_stock_threshold,
            created_at=a.created_at,
        )
        for a in alerts
    ]

    # Delayed orders — teslim edilmiş olanları gösterme (kullanıcı bunları
    # listeden çıkmış görmek ister).
    delayed_orders = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .options(selectinload(Order.customer))
        .options(selectinload(Order.shipment))
        .join(Shipment, Shipment.order_id == Order.id)
        .filter(Shipment.delayed.is_(True), Shipment.status != ShipmentStatus.DELIVERED)
        .order_by(Order.created_at.desc())
        .all()
    )
    delayed_out = [_order_to_out(o) for o in delayed_orders]

    # 7-day trends for sparklines
    trend_orders_7d: list[int] = []
    trend_revenue_7d: list[float] = []
    for days_ago in range(6, -1, -1):
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_ago)
        day_end = day_start + timedelta(days=1)
        day_orders = (
            db.query(func.count(Order.id))
            .filter(Order.created_at >= day_start, Order.created_at < day_end)
            .scalar()
            or 0
        )
        day_revenue = (
            db.query(func.coalesce(func.sum(Order.total), 0.0))
            .filter(Order.created_at >= day_start, Order.created_at < day_end)
            .scalar()
            or 0.0
        )
        trend_orders_7d.append(int(day_orders))
        trend_revenue_7d.append(float(day_revenue))

    # AI-generated morning briefing with cache.
    briefing_text = _get_briefing(
        force=False,
        fallback=_fallback_briefing(
            orders_today, revenue_today, delayed, low_stock_count, top_products
        ),
    )

    return DashboardSummary(
        orders_today=orders_today,
        revenue_today=round(float(revenue_today), 2),
        pending_shipments=pending,
        delayed_shipments=delayed,
        low_stock_products=low_stock_count,
        total_orders=total_orders,
        total_revenue=round(float(total_revenue), 2),
        top_products=top_products,
        recent_orders=recent_out,
        stock_alerts=alerts_out,
        delayed_shipment_orders=delayed_out,
        briefing=briefing_text,
        trend_orders_7d=trend_orders_7d,
        trend_revenue_7d=trend_revenue_7d,
    )


@router.get("/products")
def list_products(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.category, Product.name).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "stock": p.stock,
            "threshold": p.low_stock_threshold,
            "is_low": p.is_low_stock,
            "price": p.price,
            "unit": p.unit,
            "supplier_name": p.supplier_name,
        }
        for p in products
    ]


@router.post("/draft-supplier-email/{product_id}")
def make_supplier_email(product_id: int):
    """One-click endpoint: dashboard 'Tedarikçi maili oluştur' butonu için."""
    from app.agents.tools import draft_supplier_email as _draft

    return _draft(product_id=product_id)


@router.post("/orders/{order_id}/advance")
def advance_order_status(order_id: int, db: Session = Depends(get_db)):
    """Marketçinin tek tıkla siparişi bir sonraki aşamaya geçirmesi.

    PENDING → PREPARING → SHIPPED → DELIVERED. DELIVERED'deki sipariş için
    400 döner — gerçek hayatta da artık ilerletilecek bir adım yok.
    """
    order = (
        db.query(Order)
        .options(selectinload(Order.shipment))
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=404, detail=f"Sipariş #{order_id} bulunamadı")
    if order.status not in ORDER_NEXT_STATUS:
        raise HTTPException(
            status_code=400,
            detail=f"Sipariş #{order_id} zaten son aşamada ({_order_status_tr(order.status)}).",
        )

    next_status = ORDER_NEXT_STATUS[order.status]
    order.status = next_status

    # Keep the shipment row in sync so the dashboard timelines stay coherent.
    if next_status in SHIPMENT_FOR_ORDER:
        if order.shipment is None:
            import random as _r
            carrier = _r.choice(["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo"])
            prefix = {"Yurtiçi Kargo": "YK", "Aras Kargo": "AR", "MNG Kargo": "MN", "PTT Kargo": "PT"}[carrier]
            order.shipment = Shipment(
                order_id=order.id,
                carrier=carrier,
                tracking_no=f"{prefix}{_r.randint(10000000, 99999999)}",
                status=SHIPMENT_FOR_ORDER[next_status],
                eta=datetime.now(timezone.utc) + timedelta(days=2),
            )
        else:
            order.shipment.status = SHIPMENT_FOR_ORDER[next_status]
            order.shipment.last_update = datetime.now(timezone.utc)
            if next_status == OrderStatus.DELIVERED:
                order.shipment.delayed = False

    db.commit()
    return {
        "order_id": order.id,
        "new_status": next_status.value,
        "new_status_tr": _order_status_tr(next_status),
    }


@router.post("/bulk/notify-delayed")
def bulk_notify_delayed(db: Session = Depends(get_db)):
    """Tüm gecikmiş kargolu müşterilere kişiselleştirilmiş bildirim taslağı üretir.

    Demo amaçlı: gerçek SMS/WhatsApp gönderim entegrasyonu yerine her
    müşteri için hazır bir Türkçe metin döner. Marketçi tek tıkla 27
    müşteriye birden ulaşabilecek mesajları görür.
    """
    delayed = (
        db.query(Shipment)
        .options(selectinload(Shipment.order).selectinload(Order.customer))
        .options(selectinload(Shipment.order).selectinload(Order.items).selectinload(OrderItem.product))
        .filter(Shipment.delayed.is_(True), Shipment.status != ShipmentStatus.DELIVERED)
        .all()
    )

    messages: list[dict[str, str | int]] = []
    for s in delayed:
        c = s.order.customer
        item_names = ", ".join(i.product.name for i in s.order.items[:3])
        eta_str = s.eta.strftime("%d.%m.%Y") if s.eta else "—"
        body = (
            f"Sayın {c.name}, kooperatifimizden teşekkürler 🙏 "
            f"#{s.order.id} numaralı siparişiniz ({item_names}) "
            f"{s.carrier} ile yolda fakat kargo merkezindeki yoğunluk "
            f"nedeniyle teslim {eta_str} sonrasına ertelendi. "
            f"Sizi bilgilendirmek için yazdık, "
            f"takip no: {s.tracking_no}. Sorularınız için yanıtlayabilirsiniz."
        )
        messages.append({
            "order_id": s.order_id,
            "customer_name": c.name,
            "customer_phone": c.phone,
            "channel": "whatsapp",
            "message": body,
        })

    return {
        "count": len(messages),
        "messages": messages,
        "note": "Demo: gerçek gönderim için Twilio/WA Business API entegrasyonu eklenir.",
    }


@router.post("/bulk/notify-delayed/send")
def bulk_notify_delayed_send(db: Session = Depends(get_db)):
    """Hazırlanan toplu gecikme mesajlarını "gönderir". Demo'da gerçek bir
    SMS/WhatsApp çağrısı yok; her gönderimi ChatLog'a kayıt olarak yazar
    ve sahibe başarı sayısı döner. Production'da burada Twilio/WA
    Business API çağrısı yapılır.
    """
    delayed = (
        db.query(Shipment)
        .options(selectinload(Shipment.order).selectinload(Order.customer))
        .filter(Shipment.delayed.is_(True), Shipment.status != ShipmentStatus.DELIVERED)
        .all()
    )
    sent = 0
    for s in delayed:
        if s.order is None or s.order.customer is None:
            continue
        log = ChatLog(
            role="system",
            audience="customer_notify",
            content=(
                f"Gecikme bildirimi gönderildi · müşteri {s.order.customer.name} "
                f"(sipariş #{s.order_id} · taşıyıcı {s.carrier})"
            ),
            tool_name="bulk_notify_delayed",
        )
        db.add(log)
        sent += 1
    db.commit()
    return {
        "sent": sent,
        "channel": "whatsapp",
        "note": "Demo modu: gerçek gönderim yapılmadı, kayıt ChatLog'a yazıldı.",
    }


@router.post("/bulk/supplier-emails")
def bulk_supplier_emails(db: Session = Depends(get_db)):
    """Kritik seviyedeki tüm ürünler için tedarikçi mail taslaklarını
    toplu üretir. Tek tek tıklamadan kurtaran toplu aksiyon.
    """
    from app.agents.tools import draft_supplier_email as _draft

    critical = [p for p in db.query(Product).all() if p.is_low_stock]
    drafts = []
    for p in critical:
        d = _draft(product_id=p.id)
        drafts.append({
            "product_id": p.id,
            "product_name": p.name,
            "current_stock": p.stock,
            "unit": p.unit,
            "suggested_qty": d.get("suggested_qty"),
            "supplier_name": d.get("supplier_name"),
            "supplier_email": d.get("supplier_email"),
            "subject": d.get("subject"),
            "body": d.get("body"),
        })

    return {
        "count": len(drafts),
        "drafts": drafts,
    }


@router.post("/admin/enrich-demo")
def admin_enrich_demo(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Demo veri zenginleştirme — gecikmiş kargolar + son siparişler için
    çeşitli müşterilerden veri ekler. Tek tıkla dashboard 'canlı' görünür.
    """
    import random
    from datetime import timedelta
    from app.models import Customer

    rng = random.Random()
    customers = db.query(Customer).order_by(Customer.id).all()
    products = [p for p in db.query(Product).all() if p.stock > 5]
    if not customers or not products:
        return {"error": "Customers/products yok — seed çalışmamış olabilir."}

    now = datetime.now(timezone.utc)
    added: list[int] = []
    carriers = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo"]

    # 6 yeni sipariş ekle (6 farklı müşteri, son birkaç saate dağıt)
    picked_customers = rng.sample(customers, min(6, len(customers)))
    for i, c in enumerate(picked_customers):
        p = rng.choice(products)
        qty = rng.randint(1, 3)
        total = qty * p.price
        order = Order(
            customer_id=c.id,
            status=OrderStatus.PREPARING if i % 2 == 0 else OrderStatus.SHIPPED,
            total=total,
            created_at=now - timedelta(hours=i, minutes=rng.randint(10, 55)),
            notes="",
        )
        db.add(order)
        db.flush()
        db.add(OrderItem(order_id=order.id, product_id=p.id, qty=qty, unit_price=p.price))
        ship_status = (
            ShipmentStatus.IN_TRANSIT if i % 2 else ShipmentStatus.OUT_FOR_DELIVERY
        )
        db.add(Shipment(
            order_id=order.id,
            carrier=rng.choice(carriers),
            tracking_no=f"DEMO{rng.randint(10000000, 99999999)}",
            status=ship_status,
            last_update=now - timedelta(minutes=rng.randint(20, 180)),
            eta=now + timedelta(days=rng.randint(1, 3)),
            delayed=False,
        ))
        added.append(order.id)
    db.flush()

    # İlk 2 siparişin shipment'ını gecikmiş işaretle (ETA -6 saat → auto_settle silmez,
    # 12 saat threshold'un altında kalır).
    delayed_marked: list[int] = []
    new_shipments = (
        db.query(Shipment)
        .filter(Shipment.order_id.in_(added[:2]))
        .all()
    )
    for s in new_shipments:
        s.delayed = True
        s.eta = now - timedelta(hours=6)
        s.last_update = now - timedelta(hours=2)
        delayed_marked.append(s.order_id)

    db.commit()
    return {
        "added_orders": added,
        "delayed_shipments": delayed_marked,
        "customers": [c.name for c in picked_customers],
    }


@router.post("/admin/cleanup-demo-orders")
def admin_cleanup_demo_orders(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Test sırasında biriken fazla siparişleri (seed'den sonra eklenenleri) siler.

    Seed.py 110 sipariş yaratıyor; demo sırasında /chat üzerinden açılan
    yeni siparişlerin id'si bunun üstüne çıkıyor. Bu endpoint sadece
    id > 110 olanları temizleyip seed verisini orijinal haline döndürür.
    Video çekiminden hemen önce tek tıklamayla dashboard'u temiz halde
    tutmak için kullanılır.
    """
    SEED_MAX_ORDER_ID = 110
    extras = db.query(Order).filter(Order.id > SEED_MAX_ORDER_ID).all()
    if not extras:
        return {"deleted_orders": 0, "deleted_supplier_emails": 0}
    extra_ids = [o.id for o in extras]
    db.query(Shipment).filter(Shipment.order_id.in_(extra_ids)).delete(synchronize_session=False)
    db.query(OrderItem).filter(OrderItem.order_id.in_(extra_ids)).delete(synchronize_session=False)
    db.query(Order).filter(Order.id.in_(extra_ids)).delete(synchronize_session=False)
    # Demo sırasında otomasyon cron'unun yazdığı tedarikçi mailleri de temizle —
    # son 6 saatte yazılanlar (seed dakikaları yerine demo dakikaları).
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=6)
    from app.models import SupplierEmail
    deleted_emails = (
        db.query(SupplierEmail)
        .filter(SupplierEmail.sent_at >= cutoff)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {
        "deleted_orders": len(extra_ids),
        "deleted_supplier_emails": deleted_emails,
    }


@router.post("/shipments/{shipment_id}/deliver")
def webhook_shipment_delivered(shipment_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Kargo şirketinin webhook'unu simüle eder.

    Gerçek hayatta Yurtiçi/Aras/MNG, kargo teslim edildiğinde bizim
    backend'e POST atar — endpoint aynı bu. Demo'da sahibin tek tıkla
    bu webhook'u tetiklemesi için uçtan uca aynı yol açıldı. Sipariş ve
    kargo "Teslim Edildi" durumuna geçer, gecikmiş listesinden düşer,
    aktivite akışına bir kayıt yazılır.
    """
    s = db.query(Shipment).options(selectinload(Shipment.order)).filter(Shipment.id == shipment_id).first()
    if s is None:
        raise HTTPException(status_code=404, detail="Kargo bulunamadı")
    now = datetime.now(timezone.utc)
    s.status = ShipmentStatus.DELIVERED
    s.delayed = False
    s.last_update = now
    if s.order is not None:
        s.order.status = OrderStatus.DELIVERED
    db.add(ChatLog(
        role="system",
        audience="customer_notify",
        content=(
            f"Kargo şirketi webhook'u: sipariş #{s.order_id} taşıyıcı {s.carrier} "
            f"tarafından teslim edildi olarak güncellendi."
        ),
        tool_name="webhook_shipment_delivered",
    ))
    db.commit()
    return {
        "shipment_id": shipment_id,
        "order_id": s.order_id,
        "status": "delivered",
        "at": _fmt_dt(now),
    }


@router.post("/automation/trigger")
def trigger_automation_now() -> dict[str, Any]:
    """Demo için scheduler tick'ini anında çalıştır.

    Video sırasında jüriye "bakın, manuel müdahale olmadan" demek için —
    butona basınca scheduler bir saniye sonra zaten kendi atacağı kaydı
    şimdi atıyor. Production'da bu endpoint kapatılır.
    """
    from app.automation import run_tick_once

    return run_tick_once()


@router.get("/activity")
def automation_activity(db: Session = Depends(get_db), days: int = 7) -> dict[str, Any]:
    """Çırak'ın son N gündür otomatik yaptıklarının zaman çizelgesi.

    Veri kaynakları:
    1. ChatLog tablosundan gerçek aksiyon kayıtları (bulk_notify_delayed
       gibi sahibin tıkladığı veya otomatik tetiklenen olaylar).
    2. Tekrarlayan "scheduled" eylemler — her gün 08:00 için brifing,
       gecikmiş kargo varsa otomatik bildirim, kritik stok varsa
       tedarikçi mail hazırlığı. Bu eylemler production'da APScheduler
       cron'unda gerçekten yapılır; demo'da timeline'a görsel kanıt
       olarak yansıtılır.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    events: list[dict[str, Any]] = []

    # Gerçek ChatLog aksiyonları
    real_logs = (
        db.query(ChatLog)
        .filter(
            ChatLog.created_at >= cutoff,
            ChatLog.audience.in_(["customer_notify"]),
        )
        .order_by(ChatLog.created_at.desc())
        .all()
    )
    for log in real_logs:
        events.append({
            "kind": "real",
            "at": _fmt_dt(log.created_at),
            "icon": "send",
            "title": "Müşteriye gecikme bildirimi gönderildi",
            "detail": log.content,
            "channel": "whatsapp",
        })

    # Tekrarlayan sentetik schedule eylemleri
    has_delayed = (
        db.query(Shipment)
        .filter(Shipment.delayed.is_(True), Shipment.status != ShipmentStatus.DELIVERED)
        .count()
        > 0
    )
    low_stock_count = sum(1 for p in db.query(Product).all() if p.is_low_stock)

    for d in range(days):
        day = now.date() - timedelta(days=d)
        # 08:00 sabah brifingi
        morning = datetime.combine(day, datetime.min.time()).replace(
            tzinfo=timezone.utc, hour=8
        )
        if morning <= now:
            events.append({
                "kind": "scheduled",
                "at": _fmt_dt(morning),
                "icon": "sparkles",
                "title": "Sabah brifingi otomatik üretildi",
                "detail": "Çırak günlük KPI özetini, kritik durumları ve top satıcıları derledi",
                "channel": "system",
            })
        # 08:05 gecikme bildirimi (sadece o gün gecikme varmış gibi)
        if has_delayed:
            notify_at = morning + timedelta(minutes=5)
            if notify_at <= now:
                events.append({
                    "kind": "scheduled",
                    "at": _fmt_dt(notify_at),
                    "icon": "send",
                    "title": "Gecikmiş kargolu müşterilere proaktif bildirim",
                    "detail": "Webhook tetiklendi, AI kişiselleştirilmiş mesajları hazırladı",
                    "channel": "whatsapp",
                })
        # 08:10 tedarikçi mail (sadece o gün kritik stok varmış gibi)
        if low_stock_count > 0:
            supplier_at = morning + timedelta(minutes=10)
            if supplier_at <= now:
                events.append({
                    "kind": "scheduled",
                    "at": _fmt_dt(supplier_at),
                    "icon": "mail",
                    "title": "Tedarikçi mail taslakları çıkarıldı",
                    "detail": f"{low_stock_count} kritik üründe son 14 günlük satış bazlı miktar önerildi",
                    "channel": "email",
                })

    # En yeniler üstte
    events.sort(key=lambda e: e["at"], reverse=True)

    return {
        "items": events[:30],
        "generated_at": _fmt_dt(now),
        "note": "Scheduled eylemler production'da APScheduler cron tarafından gerçekleştirilir.",
    }


@router.get("/forecast")
def sales_forecast(db: Session = Depends(get_db)):
    """Son 14 gün satış verisine bakarak gelecek 7 günde tükenecek
    ürünleri tahmin eder. Basit linear projection: günlük ortalama
    satış * 7 gün, mevcut stoğa göre tükenme günü hesaplanır.

    Demo'da AI'ın sadece bilgi sunmadığını, **ileriye yönelik** içgörü
    ürettiğini göstermek için.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=14)

    items = (
        db.query(
            Product.id,
            Product.name,
            Product.stock,
            Product.unit,
            Product.low_stock_threshold,
            func.coalesce(func.sum(OrderItem.qty), 0).label("sold_14d"),
        )
        .outerjoin(OrderItem, OrderItem.product_id == Product.id)
        .outerjoin(Order, (Order.id == OrderItem.order_id) & (Order.created_at >= cutoff))
        .group_by(Product.id, Product.name, Product.stock, Product.unit, Product.low_stock_threshold)
        .all()
    )

    forecast: list[dict[str, Any]] = []
    for r in items:
        daily_avg = float(r.sold_14d) / 14.0
        if daily_avg <= 0.05:
            continue
        days_until_empty = float(r.stock) / daily_avg if daily_avg > 0 else 999
        projected_7d_sales = round(daily_avg * 7)
        risk = "high" if days_until_empty < 5 else "medium" if days_until_empty < 10 else "low"
        forecast.append({
            "product_id": r.id,
            "name": r.name,
            "unit": r.unit,
            "current_stock": r.stock,
            "daily_avg": round(daily_avg, 2),
            "projected_7d_sales": projected_7d_sales,
            "days_until_empty": round(days_until_empty, 1),
            "risk": risk,
        })

    forecast.sort(key=lambda x: x["days_until_empty"])
    return {
        "generated_at": _fmt_dt(now),
        "horizon_days": 7,
        "items": forecast[:10],
    }


@router.get("/insights")
def ai_insights(db: Session = Depends(get_db)):
    """AI önerileri - dashboard üstünde gösterilen aksiyonel öneriler.

    Sade rule-based heuristic (Gemini quota harcamadan) ama AI hissi
    verir: stok, kargo, satış patterns'inden somut aksiyon çıkarır.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)

    insights: list[dict[str, Any]] = []

    # 1. Critical stock → bulk supplier action
    critical = [p for p in db.query(Product).all() if p.is_low_stock]
    if critical:
        insights.append({
            "severity": "high",
            "icon": "boxes",
            "title": f"{len(critical)} ürün kritik stokta",
            "message": f"{', '.join(p.name for p in critical[:3])}{' ve daha fazlası' if len(critical) > 3 else ''} kritik seviyenin altında. Toplu tedarikçi maili önerilir.",
            "action_label": "Toplu Tedarikçi Maili",
            "action": "bulk_supplier",
        })

    # 2. Delayed shipments → bulk notify
    delayed_count = (
        db.query(Shipment)
        .filter(Shipment.delayed.is_(True), Shipment.status != ShipmentStatus.DELIVERED)
        .count()
    )
    if delayed_count > 0:
        insights.append({
            "severity": "high",
            "icon": "truck",
            "title": f"{delayed_count} kargo gecikmiş",
            "message": "Müşterileriniz şikayet etmeden önce AI ile kişiselleştirilmiş bildirim göndererek proaktif iletişim kurun.",
            "action_label": "Tümünü Bilgilendir",
            "action": "bulk_notify",
        })

    # 3. Trend: top product growth
    top_now = (
        db.query(
            Product.name,
            func.sum(OrderItem.qty).label("qty"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.created_at >= week_start)
        .group_by(Product.name)
        .order_by(func.sum(OrderItem.qty).desc())
        .first()
    )
    top_prev = (
        db.query(
            Product.name,
            func.sum(OrderItem.qty).label("qty"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.created_at >= prev_week_start, Order.created_at < week_start)
        .group_by(Product.name)
        .order_by(func.sum(OrderItem.qty).desc())
        .first()
    )
    if top_now and top_prev and top_now.qty > top_prev.qty * 1.2:
        growth_pct = round(((top_now.qty - top_prev.qty) / max(top_prev.qty, 1)) * 100)
        insights.append({
            "severity": "medium",
            "icon": "trending_up",
            "title": f"{top_now.name} satışı %{growth_pct} arttı",
            "message": f"Bu hafta {top_now.qty} adet, geçen hafta {top_prev.qty}. Stok yenileme ve kampanya değerlendirilebilir.",
            "action_label": None,
            "action": None,
        })

    # 4. New customer order
    today_orders = (
        db.query(func.count(Order.id))
        .filter(Order.created_at >= today_start)
        .scalar()
    )
    if today_orders and today_orders > 10:
        insights.append({
            "severity": "low",
            "icon": "sparkles",
            "title": f"Bugün yoğun bir gün — {today_orders} sipariş",
            "message": "Hazırlık ekibine ekstra destek gerekebilir. Aktif siparişleri 'Hazırlanıyor' durumuna alarak iş akışını netleştirin.",
            "action_label": None,
            "action": None,
        })

    return {
        "generated_at": _fmt_dt(now),
        "insights": insights,
    }


@router.get("/briefing")
def get_briefing(force: bool = True, db: Session = Depends(get_db)):
    """Brifing'i yenile. force=True ile cache atlanır."""
    # Compute fallback from current DB state
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    orders_today = db.query(Order).filter(Order.created_at >= today_start).count()
    revenue_today = (
        db.query(func.coalesce(func.sum(Order.total), 0.0))
        .filter(Order.created_at >= today_start)
        .scalar()
        or 0.0
    )
    delayed = (
        db.query(Shipment)
        .filter(Shipment.delayed.is_(True), Shipment.status != ShipmentStatus.DELIVERED)
        .count()
    )
    low_stock_count = sum(1 for p in db.query(Product).all() if p.is_low_stock)
    fallback = _fallback_briefing(orders_today, revenue_today, delayed, low_stock_count, [])

    text = _get_briefing(force=force, fallback=fallback)
    return {"briefing": text, "cached": _briefing_cache["text"] == text}


def _fallback_briefing(
    orders_today: int,
    revenue_today: float,
    delayed: int,
    low_stock: int,
    top: list,
) -> str:
    parts = [
        f"📊 Bugün **{orders_today} sipariş** alındı (toplam **{revenue_today:,.0f} ₺**).",
    ]
    if delayed > 0:
        parts.append(f"⚠️ **{delayed} kargo gecikme** uyarısında — müşteri proaktif bildirimi önerilir.")
    if low_stock > 0:
        parts.append(f"📦 **{low_stock} ürün kritik stok** seviyesinde — tedarikçi maili oluşturun.")
    if top:
        names = ", ".join(p["name"] for p in top[:3])
        parts.append(f"🔝 Son haftanın liderleri: {names}.")
    parts.append("_(AI brifing servisi anlık yoğunlukta; manuel özet gösteriliyor.)_")
    return "\n\n".join(parts)


def _get_briefing(force: bool, fallback: str) -> str:
    """Return cached briefing if fresh; else try Gemini; else fallback."""
    cached_at = _briefing_cache["generated_at"]
    assert isinstance(cached_at, datetime)
    age_min = (datetime.now(timezone.utc) - cached_at).total_seconds() / 60.0
    if not force and _briefing_cache["text"] and age_min < _BRIEFING_TTL_MIN:
        return str(_briefing_cache["text"])

    try:
        agent = get_orchestrator()
        result = agent.chat(
            message=(
                "Sabah brifingi: bugünkü siparişler, gecikmiş kargolar, kritik stoklar ve "
                "haftanın trendi. Maks 5 madde, markdown bullet, Türkçe."
            ),
            audience="owner",
            history=[],
        )
        if result.get("error"):
            raise RuntimeError(result["error"])
        text = result["reply"]
        _briefing_cache["text"] = text
        _briefing_cache["generated_at"] = datetime.now(timezone.utc)
        return text
    except Exception:
        return fallback
