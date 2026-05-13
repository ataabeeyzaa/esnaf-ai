"""Seed mock data — gerçekçi bir tarım/gıda kooperatifi senaryosu."""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import (
    ChatLog,
    Customer,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    Shipment,
    ShipmentStatus,
    StockAlert,
)


PRODUCTS = [
    # Organik sebze-meyve
    ("Organik Domates", "TAR-DOM-001", "sebze", 12, 50, 35.0, "kg"),
    ("Organik Salatalık", "TAR-SAL-002", "sebze", 80, 30, 28.0, "kg"),
    ("Organik Biber", "TAR-BIB-003", "sebze", 45, 25, 42.0, "kg"),
    ("Organik Patlıcan", "TAR-PAT-004", "sebze", 60, 20, 38.0, "kg"),
    ("Köy Yumurtası (30'lu)", "TAR-YUM-005", "kahvaltılık", 8, 15, 145.0, "paket"),
    ("Organik Limon", "TAR-LIM-006", "meyve", 30, 20, 55.0, "kg"),
    ("Köy Bal (1 kg)", "TAR-BAL-007", "kahvaltılık", 25, 10, 320.0, "kavanoz"),
    ("Süzme Tereyağı (500 gr)", "TAR-TER-008", "kahvaltılık", 18, 12, 185.0, "paket"),
    # Zeytin & yağ
    ("Sızma Zeytinyağı 1 L", "ZEY-001", "zeytin", 6, 20, 295.0, "şişe"),
    ("Sızma Zeytinyağı 5 L", "ZEY-002", "zeytin", 14, 8, 1290.0, "teneke"),
    ("Yeşil Zeytin (500 gr)", "ZEY-003", "zeytin", 95, 30, 95.0, "paket"),
    ("Siyah Zeytin (500 gr)", "ZEY-004", "zeytin", 110, 30, 90.0, "paket"),
    # Süt ürünleri
    ("Köy Peyniri (500 gr)", "SUT-001", "süt", 22, 15, 175.0, "paket"),
    ("Lor Peyniri (500 gr)", "SUT-002", "süt", 9, 12, 95.0, "paket"),
    ("Süzme Yoğurt (1 kg)", "SUT-003", "süt", 35, 25, 85.0, "kova"),
    ("Tulum Peyniri (1 kg)", "SUT-004", "süt", 4, 8, 420.0, "paket"),
    # Bakliyat & tahıl
    ("Bulgur (1 kg)", "BAK-001", "bakliyat", 120, 50, 55.0, "paket"),
    ("Nohut (1 kg)", "BAK-002", "bakliyat", 85, 40, 75.0, "paket"),
    ("Kuru Fasulye (1 kg)", "BAK-003", "bakliyat", 70, 40, 95.0, "paket"),
    ("Mercimek (1 kg)", "BAK-004", "bakliyat", 95, 40, 65.0, "paket"),
    # Reçel & turşu
    ("Çilek Reçeli (450 gr)", "REC-001", "reçel", 40, 15, 115.0, "kavanoz"),
    ("Vişne Reçeli (450 gr)", "REC-002", "reçel", 7, 15, 125.0, "kavanoz"),
    ("Kayısı Reçeli (450 gr)", "REC-003", "reçel", 35, 15, 110.0, "kavanoz"),
    ("Karışık Turşu (1 L)", "REC-004", "turşu", 50, 20, 145.0, "kavanoz"),
    # Bitkisel ürünler
    ("Adaçayı (50 gr)", "BIT-001", "bitkisel", 100, 30, 65.0, "paket"),
    ("Ihlamur (50 gr)", "BIT-002", "bitkisel", 85, 30, 75.0, "paket"),
    ("Kekik (100 gr)", "BIT-003", "bitkisel", 75, 25, 85.0, "paket"),
    ("Karabaş Çayı (50 gr)", "BIT-004", "bitkisel", 11, 20, 95.0, "paket"),
    # Kuruyemiş
    ("Çiğ Badem (500 gr)", "KUR-001", "kuruyemiş", 28, 15, 285.0, "paket"),
    ("Ceviz İçi (500 gr)", "KUR-002", "kuruyemiş", 16, 12, 345.0, "paket"),
    ("Fındık İçi (500 gr)", "KUR-003", "kuruyemiş", 24, 12, 295.0, "paket"),
    ("Kuru Üzüm (500 gr)", "KUR-004", "kuruyemiş", 55, 25, 95.0, "paket"),
]


SUPPLIERS = {
    "sebze": ("Yenidoğan Tarım Koop.", "satinalma@yenidogantarim.coop"),
    "meyve": ("Yenidoğan Tarım Koop.", "satinalma@yenidogantarim.coop"),
    "kahvaltılık": ("Toros Köy Ürünleri", "siparis@toroskoy.com.tr"),
    "zeytin": ("Egem Zeytin Ailesi", "uretim@egemzeytin.com.tr"),
    "süt": ("Yayla Süt Üreticileri Birliği", "siparis@yaylasut.coop"),
    "bakliyat": ("Anadolu Bakliyat", "satis@anadolubakliyat.com.tr"),
    "reçel": ("Nene Mutfağı", "siparis@nenemutfagi.com.tr"),
    "turşu": ("Nene Mutfağı", "siparis@nenemutfagi.com.tr"),
    "bitkisel": ("Şifa Bitkileri Kooperatifi", "uretim@sifabitkileri.coop"),
    "kuruyemiş": ("Karadeniz Kuruyemiş", "siparis@karadenizkuruyemis.com.tr"),
}


CUSTOMERS = [
    ("Ayşe Yılmaz", "+90 532 145 8821", "ayse.yilmaz@example.com", "İstanbul"),
    ("Mehmet Kaya", "+90 533 287 4412", "mehmet.kaya@example.com", "Ankara"),
    ("Zeynep Aydın", "+90 535 432 1187", "zeynep.aydin@example.com", "İzmir"),
    ("Mustafa Demir", "+90 542 998 7766", "m.demir@example.com", "Bursa"),
    ("Elif Şahin", "+90 544 123 4567", "elif.sahin@example.com", "Antalya"),
    ("Ali Çelik", "+90 549 887 2233", "ali.celik@example.com", "Adana"),
    ("Fatma Öztürk", "+90 538 654 1290", "fatma.ozturk@example.com", "Eskişehir"),
    ("Beyza ATA", "+90 555 321 8854", "beyza.ata@example.com", "Kastamonu"),
    ("Merve Yıldız", "+90 537 778 1122", "merve.y@example.com", "Trabzon"),
    ("Burak Doğan", "+90 530 446 5587", "burak.dogan@example.com", "Gaziantep"),
    ("Selin Aksoy", "+90 543 998 1144", "selin.aksoy@example.com", "İstanbul"),
    ("Cem Polat", "+90 532 776 5432", "cem.polat@example.com", "İzmir"),
    ("Esra Türk", "+90 535 887 6611", "esra.turk@example.com", "Samsun"),
    ("Kerem Avcı", "+90 541 223 7798", "kerem.avci@example.com", "Mersin"),
    ("Deniz Korkmaz", "+90 546 112 3344", "deniz.k@example.com", "Kayseri"),
    ("Gülşen Erdoğan", "+90 539 665 8821", "gulsen.erdogan@example.com", "Diyarbakır"),
    ("Onur Şen", "+90 542 334 5566", "onur.sen@example.com", "Tekirdağ"),
    ("Yasemin Aktaş", "+90 538 776 4400", "yasemin.aktas@example.com", "Sakarya"),
    ("Tolga Bulut", "+90 533 889 1122", "tolga.bulut@example.com", "Balıkesir"),
    ("Pınar Güneş", "+90 549 112 8877", "pinar.gunes@example.com", "Aydın"),
]


CARRIERS = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo"]


def _tracking_no(carrier: str) -> str:
    prefix = {"Yurtiçi Kargo": "YK", "Aras Kargo": "AR", "MNG Kargo": "MN", "PTT Kargo": "PT", "Sürat Kargo": "SR"}[carrier]
    return f"{prefix}{random.randint(10000000, 99999999)}"


def seed(db: Session) -> None:
    db.query(ChatLog).delete()
    db.query(StockAlert).delete()
    db.query(Shipment).delete()
    db.query(OrderItem).delete()
    db.query(Order).delete()
    db.query(Customer).delete()
    db.query(Product).delete()
    db.commit()

    rng = random.Random(42)

    # Products
    products: list[Product] = []
    for name, sku, category, stock, threshold, price, unit in PRODUCTS:
        supplier_name, supplier_email = SUPPLIERS.get(category, ("Genel Tedarikçi", "info@tedarikci.com.tr"))
        p = Product(
            name=name,
            sku=sku,
            category=category,
            stock=stock,
            low_stock_threshold=threshold,
            price=price,
            unit=unit,
            supplier_name=supplier_name,
            supplier_email=supplier_email,
            description=f"{name} — kooperatif üretimi, doğal.",
        )
        db.add(p)
        products.append(p)
    db.commit()

    # Customers
    customers: list[Customer] = []
    for name, phone, email, city in CUSTOMERS:
        c = Customer(name=name, phone=phone, email=email, city=city)
        db.add(c)
        customers.append(c)
    db.commit()

    # Orders — son 14 günde 100+ sipariş
    now = datetime.now(timezone.utc)
    order_count = 110
    for i in range(order_count):
        days_ago = rng.choices(range(15), weights=[20, 18, 14, 10, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 0])[0]
        hours_ago = rng.randint(0, 23)
        created = now - timedelta(days=days_ago, hours=hours_ago)
        customer = rng.choice(customers)

        order = Order(
            customer_id=customer.id,
            status=OrderStatus.PENDING,
            created_at=created,
            total=0.0,
        )
        db.add(order)
        db.flush()

        # 1-4 ürün
        chosen_products = rng.sample(products, k=rng.randint(1, 4))
        total = 0.0
        for prod in chosen_products:
            qty = rng.randint(1, 3)
            item = OrderItem(order_id=order.id, product_id=prod.id, qty=qty, unit_price=prod.price)
            total += qty * prod.price
            db.add(item)
        order.total = round(total, 2)

        # Status by age
        if days_ago == 0:
            order.status = rng.choice([OrderStatus.PENDING, OrderStatus.PREPARING])
        elif days_ago == 1:
            order.status = rng.choice([OrderStatus.PREPARING, OrderStatus.SHIPPED])
        elif days_ago <= 3:
            order.status = OrderStatus.SHIPPED
        else:
            order.status = rng.choice([OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.SHIPPED])

        # Shipment for non-pending orders
        if order.status in (OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.PREPARING):
            carrier = rng.choice(CARRIERS)
            if order.status == OrderStatus.DELIVERED:
                ship_status = ShipmentStatus.DELIVERED
                eta = created + timedelta(days=rng.randint(2, 4))
                delayed = False
            elif order.status == OrderStatus.SHIPPED:
                ship_status = rng.choice([ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY])
                expected_days = rng.randint(2, 4)
                eta = created + timedelta(days=expected_days)
                delayed = eta < now and ship_status != ShipmentStatus.DELIVERED
            else:
                ship_status = ShipmentStatus.LABEL_CREATED
                eta = created + timedelta(days=rng.randint(2, 5))
                delayed = False

            shipment = Shipment(
                order_id=order.id,
                carrier=carrier,
                tracking_no=_tracking_no(carrier),
                status=ship_status,
                last_update=created + timedelta(hours=rng.randint(2, 48)),
                eta=eta,
                delayed=delayed,
                notes="Gecikme — kargo merkezi yoğunluğu" if delayed else "",
            )
            db.add(shipment)

    db.commit()

    # Stock alerts for low-stock products
    for p in products:
        if p.is_low_stock:
            alert = StockAlert(
                product_id=p.id,
                message=f"{p.name} stoğu {p.stock} {p.unit} kaldı (kritik eşik: {p.low_stock_threshold}).",
                resolved=False,
            )
            db.add(alert)
    db.commit()


def reset_and_seed() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
        product_count = db.query(Product).count()
        customer_count = db.query(Customer).count()
        order_count = db.query(Order).count()
        shipment_count = db.query(Shipment).count()
        alert_count = db.query(StockAlert).count()
        print(f"Seed tamamlandı:")
        print(f"  Ürünler: {product_count}")
        print(f"  Müşteriler: {customer_count}")
        print(f"  Siparişler: {order_count}")
        print(f"  Kargolar: {shipment_count}")
        print(f"  Stok uyarıları: {alert_count}")
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
