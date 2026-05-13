"""Demo otomasyon zamanlayıcısı.

Production'da APScheduler veya Render Cron Worker üzerinden çalışır.
Burada basit bir asyncio background task var: her N saniyede bir DB'yi
kontrol eder, koşullar uygunsa "Çırak otomatik X yaptı" şeklinde
ChatLog'a kayıt atar. AutomationPanel'in aktivite akışı bu kayıtları
canlı olarak gösterir.

Bu, demo videosunda "otomatik çalışıyor" iddiasının canlı kanıtıdır —
butona basmadan, sahibe haber vermeden, sahnedeki herkesin gözü
önünde, arka planda yeni satırlar düşer.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import selectinload

from app.db import SessionLocal
from app.models import ChatLog, Order, OrderItem, Product, Shipment, ShipmentStatus, SupplierEmail


logger = logging.getLogger(__name__)

# Demo aralığı — production'da APScheduler ile günlük 08:00'a bağlanır.
# Burada 90 saniyede bir bakıyoruz ki demo izleyicisi 1-2 dakikada
# canlı satır gelmesini görebilsin.
TICK_INTERVAL_SECONDS = 90

# Iki tick arası "aynı şeyi tekrar yazma" guard'ı — son 5 dakikada bir
# scheduled aksiyon yazılmışsa tekrar yazma.
SUPPRESS_REPEAT_MINUTES = 5


def _has_recent_log(session, tool_name: str, minutes: int) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    return (
        session.query(ChatLog)
        .filter(ChatLog.tool_name == tool_name, ChatLog.created_at >= cutoff)
        .first()
        is not None
    )


def _has_recent_supplier_email(session, product_id: int, hours: int) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    return (
        session.query(SupplierEmail)
        .filter(SupplierEmail.product_id == product_id, SupplierEmail.sent_at >= cutoff)
        .first()
        is not None
    )


def run_tick_once() -> dict:
    """Bir defalık tick — manuel tetikleme veya scheduler döngüsünden çağrılır.

    Döndürdüğü dict: hangi aksiyonların yazıldığı.
    """
    session = SessionLocal()
    written: list[str] = []
    try:
        # 1) Gecikmiş kargo varsa → bildirim eylemi yaz
        delayed_count = (
            session.query(Shipment)
            .options(selectinload(Shipment.order).selectinload(Order.customer))
            .filter(
                Shipment.delayed.is_(True),
                Shipment.status != ShipmentStatus.DELIVERED,
            )
            .count()
        )
        if delayed_count > 0 and not _has_recent_log(session, "auto_notify_delayed", SUPPRESS_REPEAT_MINUTES):
            session.add(ChatLog(
                role="system",
                audience="customer_notify",
                content=(
                    f"Otomatik tarama — {delayed_count} gecikmiş kargolu müşteriye "
                    f"WhatsApp üzerinden proaktif bildirim hazırlandı."
                ),
                tool_name="auto_notify_delayed",
            ))
            written.append("delayed_notify")

        # 2) Kritik stok varsa → her ürün için tedarikçiye mail gönder
        low_stock = [p for p in session.query(Product).all() if p.is_low_stock]
        new_emails: list[str] = []
        for p in low_stock:
            # Aynı ürün için 24 saatte zaten otomatik gitmiş mi?
            if _has_recent_supplier_email(session, p.id, hours=24):
                continue
            if not p.supplier_email:
                continue
            # Lazy import — sirküler import'tan kaçınmak için
            from app.agents.tools import draft_supplier_email as _draft
            d = _draft(product_id=p.id)
            if d.get("error"):
                continue
            session.add(SupplierEmail(
                product_id=p.id,
                supplier_name=d.get("supplier_name") or p.supplier_name or "Tedarikçi",
                supplier_email=d.get("supplier_email") or p.supplier_email,
                subject=d.get("subject") or f"{p.name} sipariş talebi",
                body=d.get("body") or "",
                auto=True,
                suggested_qty=int(d.get("suggested_qty") or 0),
                unit=p.unit,
            ))
            new_emails.append(p.name)

        if new_emails and not _has_recent_log(session, "auto_supplier_email", SUPPRESS_REPEAT_MINUTES):
            session.add(ChatLog(
                role="system",
                audience="customer_notify",
                content=(
                    f"Otomatik tarama — {len(new_emails)} kritik ürün için "
                    f"tedarikçi mailleri gönderildi: {', '.join(new_emails[:3])}"
                    + (" ve diğerleri" if len(new_emails) > 3 else "")
                ),
                tool_name="auto_supplier_email",
            ))
            written.append("supplier_email")

        if written:
            session.commit()
    except Exception:  # noqa: BLE001
        logger.exception("Tick failed")
        session.rollback()
    finally:
        session.close()

    return {"written": written, "tick_at": datetime.now(timezone.utc).isoformat()}


async def scheduler_loop() -> None:
    """Asyncio cron — backend yaşadığı sürece sürekli çalışır."""
    logger.info("Otomasyon scheduler başladı (her %ss tick)", TICK_INTERVAL_SECONDS)
    while True:
        try:
            result = run_tick_once()
            if result["written"]:
                logger.info("Otomasyon tick yazdı: %s", result["written"])
        except Exception:  # noqa: BLE001
            logger.exception("Scheduler tick hatası")
        await asyncio.sleep(TICK_INTERVAL_SECONDS)
