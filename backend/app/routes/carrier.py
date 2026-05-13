"""Kargo şirketi portalı — kuryelerin teslim edilecek kargoları gördüğü panel.

Bu modül, demo videoda "kargo gecikmişten nereye düşüyor" sorusunun
ekran kanıtıdır. Aktif kargolar listelenir; her satırda "Teslim ettim"
butonu var (mevcut /dashboard/shipments/{id}/deliver webhook'unu çağırır).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.agents.tools import _fmt_dt
from app.db import get_db
from app.models import Order, OrderItem, Shipment, ShipmentStatus


router = APIRouter(prefix="/carrier", tags=["carrier"])


_ACTIVE_STATUSES = [
    ShipmentStatus.LABEL_CREATED,
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.EXCEPTION,
]


_STATUS_LABEL = {
    ShipmentStatus.LABEL_CREATED: "Etiket oluşturuldu",
    ShipmentStatus.PICKED_UP: "Şubeden alındı",
    ShipmentStatus.IN_TRANSIT: "Yolda",
    ShipmentStatus.OUT_FOR_DELIVERY: "Dağıtımda",
    ShipmentStatus.EXCEPTION: "Sorun var",
}


_PRIORITY = {
    ShipmentStatus.OUT_FOR_DELIVERY: 0,
    ShipmentStatus.IN_TRANSIT: 1,
    ShipmentStatus.PICKED_UP: 2,
    ShipmentStatus.LABEL_CREATED: 3,
    ShipmentStatus.EXCEPTION: 0,
}


@router.get("/dashboard")
def carrier_dashboard(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Aktif (henüz teslim edilmemiş) tüm kargoların listesi.

    Önce dağıtımda olanlar, sonra yolda, sonra şubeden alınanlar gibi
    pratik bir sıra ile döner. Her satır frontend'de bir "Teslim ettim"
    butonu görür.
    """
    rows = (
        db.query(Shipment)
        .options(
            selectinload(Shipment.order).selectinload(Order.customer),
            selectinload(Shipment.order).selectinload(Order.items).selectinload(OrderItem.product),
        )
        .filter(Shipment.status.in_(_ACTIVE_STATUSES))
        .order_by(Shipment.last_update.desc())
        .all()
    )

    items: list[dict[str, Any]] = []
    for s in rows:
        if s.order is None:
            continue
        customer = s.order.customer
        first_items = [i.product.name for i in s.order.items[:3]] if s.order.items else []
        items.append({
            "shipment_id": s.id,
            "order_id": s.order_id,
            "carrier": s.carrier,
            "tracking_no": s.tracking_no,
            "status": s.status.value,
            "status_label": _STATUS_LABEL[s.status],
            "priority": _PRIORITY.get(s.status, 9),
            "eta": _fmt_dt(s.eta) if s.eta else None,
            "delayed": s.delayed,
            "last_update": _fmt_dt(s.last_update),
            "customer_name": customer.name if customer else "—",
            "customer_phone": customer.phone if customer else "",
            "customer_city": customer.city if customer else "",
            "products": first_items,
            "total": s.order.total,
        })

    items.sort(key=lambda x: (x["priority"], x["last_update"]))

    # Özet sayılar
    counts = {
        "delivering": sum(1 for i in items if i["status"] == ShipmentStatus.OUT_FOR_DELIVERY.value),
        "in_transit": sum(1 for i in items if i["status"] == ShipmentStatus.IN_TRANSIT.value),
        "picked_up": sum(1 for i in items if i["status"] == ShipmentStatus.PICKED_UP.value),
        "label_created": sum(1 for i in items if i["status"] == ShipmentStatus.LABEL_CREATED.value),
        "delayed": sum(1 for i in items if i["delayed"]),
        "total_active": len(items),
    }

    return {
        "items": items,
        "counts": counts,
        "generated_at": _fmt_dt(datetime.now(timezone.utc)),
    }
