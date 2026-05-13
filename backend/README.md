# Çırak — Backend

FastAPI + Python 3.11 + SQLAlchemy + SQLite. Gemini 2.5 Flash Lite ile çoklu-ajan orchestrator.

## Kurulum

```bash
python -m venv .venv
source .venv/Scripts/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed                # SQLite + mock data
uvicorn app.main:app --reload
```

Sunucu: http://localhost:8000 · API dokümanı: http://localhost:8000/docs

## API

| Method | Path | Açıklama |
|--------|------|----------|
| GET    | `/health` | Sağlık kontrolü |
| POST   | `/chat/customer` | Müşteri chat (3 tool aktif) |
| POST   | `/chat/owner` | İşletmeci chat (5 tool aktif) |
| GET    | `/dashboard/summary` | KPI'lar + son siparişler + AI brifingi |
| GET    | `/dashboard/products` | Tüm ürünler |
| POST   | `/dashboard/draft-supplier-email/{product_id}` | Tek-tıkla mail taslağı |
| GET    | `/dashboard/briefing` | AI brifingi yenile |

## Agent Mimarisi

Manuel function-calling loop:

1. Gemini'ye sistem prompt + mesaj + tool listesi gönderilir.
2. Gemini bir veya birden fazla `function_call` döner.
3. Backend tool'u **kendi** Python ortamında çalıştırır (DB query).
4. Sonuç `function_response` part olarak konuşmaya eklenir.
5. Gemini'ye tekrar gönderilir, ya yeni tool çağrılır ya da final cevap döner.

Bu yaklaşımın avantajları:
- **Her HTTP çağrısı bağımsız retry edilir** (Gemini API'da 503/429 sık).
- **Tool sonuçları log'lanabilir** (şeffaflık).
- **Model fallback**: 2.5-flash-lite → 2.0-flash → 2.5-flash zinciri ile quota'ya takılınca otomatik geçiş.

## Tool'lar

| Tool | Görev |
|------|-------|
| `lookup_order(order_id, customer_phone?)` | Sipariş detayları (ürünler, kargo, durum) |
| `check_stock(product_query)` | Ürün/kategori bazlı stok sorgusu (fuzzy) |
| `track_shipment(order_id)` | Kargo durumu, gecikme tespiti (order_id=0 → tüm geciken) |
| `draft_supplier_email(product_id, qty?)` | Tedarikçi mail taslağı + miktar tahmini |
| `daily_briefing(focus?)` | Günlük operasyon özeti |

## Veritabanı

SQLite, `esnaf.db`. `python -m app.seed` ile sıfırlanır:

- 35 ürün (tarım/gıda kooperatifi temalı)
- 20 müşteri
- 110 sipariş (son 14 gün)
- 99 kargo kaydı
- 7 kritik stok uyarısı
