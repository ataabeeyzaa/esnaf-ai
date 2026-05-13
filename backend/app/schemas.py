from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    customer_phone: str | None = None
    history: list[dict[str, str]] = Field(default_factory=list)
    # Hızlı mod — Gemini'yi atlar, sadece keyword router + canned fallback
    # kullanır. Token harcamadan demo testi yapmak için.
    fast_mode: bool = False


class ChatResponse(BaseModel):
    reply: str
    tools_used: list[dict[str, Any]] = Field(default_factory=list)
    fallback: str | None = None
    model_used: str | None = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    category: str
    stock: int
    low_stock_threshold: int
    price: float
    unit: str
    is_low_stock: bool


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_name: str
    qty: int
    unit_price: float


class ShipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    carrier: str
    tracking_no: str
    status: str
    last_update: datetime
    eta: datetime | None
    delayed: bool


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    total: float
    created_at: datetime
    customer_name: str
    items: list[OrderItemOut]
    shipment: ShipmentOut | None


class StockAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    stock: int
    low_stock_threshold: int
    created_at: datetime


class DashboardSummary(BaseModel):
    orders_today: int
    revenue_today: float
    pending_shipments: int
    delayed_shipments: int
    low_stock_products: int
    total_orders: int
    total_revenue: float
    top_products: list[dict[str, Any]]
    recent_orders: list[OrderOut]
    stock_alerts: list[StockAlertOut]
    delayed_shipment_orders: list[OrderOut]
    briefing: str
    # 7-day trends for sparklines (oldest → newest)
    trend_orders_7d: list[int] = Field(default_factory=list)
    trend_revenue_7d: list[float] = Field(default_factory=list)
