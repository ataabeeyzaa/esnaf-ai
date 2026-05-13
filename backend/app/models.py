from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OrderStatus(str, PyEnum):
    PENDING = "pending"
    PREPARING = "preparing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class ShipmentStatus(str, PyEnum):
    LABEL_CREATED = "label_created"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    EXCEPTION = "exception"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(80), default="genel")
    stock: Mapped[int] = mapped_column(Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=10)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str] = mapped_column(String(20), default="adet")
    supplier_name: Mapped[str] = mapped_column(String(120), default="")
    supplier_email: Mapped[str] = mapped_column(String(120), default="")
    description: Mapped[str] = mapped_column(Text, default="")

    items: Mapped[list["OrderItem"]] = relationship(back_populates="product")
    alerts: Mapped[list["StockAlert"]] = relationship(back_populates="product")

    @property
    def is_low_stock(self) -> bool:
        return self.stock <= self.low_stock_threshold


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), index=True)
    email: Mapped[str] = mapped_column(String(160), default="")
    city: Mapped[str] = mapped_column(String(80), default="")

    orders: Mapped[list["Order"]] = relationship(back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.PENDING)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    notes: Mapped[str] = mapped_column(Text, default="")

    customer: Mapped["Customer"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    shipment: Mapped["Shipment | None"] = relationship(back_populates="order", uselist=False, cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    qty: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="items")


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), unique=True)
    carrier: Mapped[str] = mapped_column(String(80), default="Yurtiçi Kargo")
    tracking_no: Mapped[str] = mapped_column(String(60), default="")
    status: Mapped[ShipmentStatus] = mapped_column(Enum(ShipmentStatus), default=ShipmentStatus.LABEL_CREATED)
    last_update: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    eta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delayed: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")

    order: Mapped["Order"] = relationship(back_populates="shipment")


class StockAlert(Base):
    __tablename__ = "stock_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    message: Mapped[str] = mapped_column(Text, default="")

    product: Mapped["Product"] = relationship(back_populates="alerts")


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[str] = mapped_column(String(20))  # user | assistant | tool
    audience: Mapped[str] = mapped_column(String(20))  # customer | owner
    content: Mapped[str] = mapped_column(Text)
    tool_name: Mapped[str] = mapped_column(String(60), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SupplierEmail(Base):
    """Gönderilmiş tedarikçi mailleri — /supplier-portal'da listelenir.

    AI taslakladığı maili sahibe ya manuel olarak (SupplierEmailModal
    içindeki Gönder butonu) ya da otomatik (otomasyon cron'u) bu tabloya
    yazar. Production'da gerçek SMTP gönderimi sonrası burası işaretlenir.
    """

    __tablename__ = "supplier_emails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    supplier_name: Mapped[str] = mapped_column(String(120))
    supplier_email: Mapped[str] = mapped_column(String(160), index=True)
    subject: Mapped[str] = mapped_column(String(240))
    body: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    auto: Mapped[bool] = mapped_column(Boolean, default=False)
    suggested_qty: Mapped[int] = mapped_column(Integer, default=0)
    unit: Mapped[str] = mapped_column(String(20), default="adet")

    product: Mapped["Product"] = relationship()
