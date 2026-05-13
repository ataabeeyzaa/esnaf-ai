"""Tedarikçi portalı — AI'ın gönderdiği mailleri tedarikçi cephesinde gösterir.

Bu modül, demo videoda "kritik stok düşünce sistem ne yapıyor"
sorusunun ekran kanıtıdır. SupplierEmail tablosuna düşen kayıtları
Gmail-tarzı bir liste olarak döndürür.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.agents.tools import _fmt_dt, draft_supplier_email as _draft
from app.db import get_db
from app.models import ChatLog, Product, SupplierEmail


router = APIRouter(prefix="/supplier", tags=["supplier"])


@router.get("/inbox")
def supplier_inbox(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Gönderilmiş tüm tedarikçi mailleri (en yeniden eskiye)."""
    rows = (
        db.query(SupplierEmail)
        .options(selectinload(SupplierEmail.product))
        .order_by(SupplierEmail.sent_at.desc())
        .limit(50)
        .all()
    )
    items: list[dict[str, Any]] = []
    for r in rows:
        items.append({
            "id": r.id,
            "product_id": r.product_id,
            "product_name": r.product.name if r.product else "—",
            "supplier_name": r.supplier_name,
            "supplier_email": r.supplier_email,
            "subject": r.subject,
            "body": r.body,
            "sent_at": _fmt_dt(r.sent_at),
            "auto": r.auto,
            "suggested_qty": r.suggested_qty,
            "unit": r.unit,
        })
    # Tedarikçi başına gruplandırma için ayrı bir set
    suppliers = sorted({(r.supplier_name, r.supplier_email) for r in rows})
    return {
        "items": items,
        "supplier_count": len(suppliers),
        "total": len(items),
        "generated_at": _fmt_dt(datetime.now(timezone.utc)),
    }


@router.post("/send/{product_id}")
def supplier_send_manual(product_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Sahibin SupplierEmailModal'dan "Gönder" diyerek tetiklediği gönderim.

    AI draft'ı tekrar üretir ve SupplierEmail tablosuna manual=True
    olarak yazar. Tedarikçi portalında anında görünür.
    """
    p = db.query(Product).filter(Product.id == product_id).first()
    if p is None:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    if not p.supplier_email:
        raise HTTPException(status_code=400, detail="Bu ürünün tedarikçi e-postası tanımlı değil")
    d = _draft(product_id=product_id)
    if d.get("error"):
        raise HTTPException(status_code=500, detail=str(d.get("error")))
    row = SupplierEmail(
        product_id=product_id,
        supplier_name=d.get("supplier_name") or p.supplier_name or "Tedarikçi",
        supplier_email=d.get("supplier_email") or p.supplier_email,
        subject=d.get("subject") or f"{p.name} sipariş talebi",
        body=d.get("body") or "",
        auto=False,
        suggested_qty=int(d.get("suggested_qty") or 0),
        unit=p.unit,
    )
    db.add(row)
    db.add(ChatLog(
        role="system",
        audience="customer_notify",
        content=(
            f"Tedarikçiye mail gönderildi · ürün {p.name} · "
            f"tedarikçi {row.supplier_name} ({row.supplier_email})"
        ),
        tool_name="manual_supplier_email",
    ))
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "product_name": p.name,
        "supplier_email": row.supplier_email,
        "sent_at": _fmt_dt(row.sent_at),
    }
