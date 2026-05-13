import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.automation import scheduler_loop
from app.db import Base, engine
from app.routes import carrier, chat, customer, dashboard, supplier


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="Çırak",
    description="KOBİ ve kooperatifler için çoklu-ajan operasyon asistanı — YZTA 5.0 Hackathon",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-create tables on startup (idempotent)
Base.metadata.create_all(bind=engine)

app.include_router(chat.router)
app.include_router(customer.router)
app.include_router(dashboard.router)
app.include_router(supplier.router)
app.include_router(carrier.router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Çırak",
        "status": "ok",
        "docs": "/docs",
        "endpoints": (
            "/chat/customer, /chat/owner, "
            "/dashboard/summary, /dashboard/forecast, /dashboard/insights, /dashboard/activity, "
            "/customer/list, /customer/notifications, /customer/campaigns, /customer/help, "
            "/supplier/inbox, /supplier/send/{product_id}, "
            "/carrier/dashboard"
        ),
    }


@app.on_event("startup")
async def start_automation_scheduler() -> None:
    """Backend uyandığında otomasyon zamanlayıcısını başlat.

    Render free tier'da backend uykuda iken cron çalışmaz; istek
    geldiğinde uyanır ve buradan itibaren tick'ler düşer. Demo için
    yeterli — sahibe önce /health ile uyandır, sonra canlı satırları
    izle.
    """
    asyncio.create_task(scheduler_loop())


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}
