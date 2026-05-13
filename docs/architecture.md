# ESNAF AI — Mimari ve AI Yaklaşımı

## Tek Cümle Özet

ESNAF AI, KOBİ ve kooperatifler için **Gemini 2.5** tabanlı bir **çoklu-ajan orchestrator** sistemi: müşteri sorularına anında cevap verir, stok-kargo-sipariş süreçlerini takip eder, tedarikçi maili gibi **gerçek aksiyonları otomatize eder**.

## Sistem Mimarisi

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  Müşteri Chat (WhatsApp │         │  İşletmeci Dashboard     │
│    benzeri arayüz)      │         │  (KPI + AI asistan)      │
│   Next.js 14 + Tailwind │         │   Next.js 14 + Tailwind  │
└────────────┬────────────┘         └────────────┬─────────────┘
             │ HTTP                                │ HTTP
             ▼                                     ▼
        ┌────────────────────────────────────────────────┐
        │            FastAPI (Python 3.11)               │
        │   /chat/customer   /chat/owner   /dashboard/*  │
        └───────────────────────┬────────────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │  Orchestrator Agent            │
                │  (manuel function-calling loop)│
                │  - sistem prompt (rol-bazlı)   │
                │  - tool listesi (rol-bazlı)    │
                │  - retry + model fallback      │
                └───┬──────────────┬─────────────┘
                    │              │
                    │              ▼
                    │   ┌─────────────────────────┐
                    │   │   Gemini 2.5 Flash Lite │
                    │   │   (function-calling)    │
                    │   └─────────────────────────┘
                    │
        ┌───────────┼───────────┬───────────┬──────────────┐
        ▼           ▼           ▼           ▼              ▼
   ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐
   │ Order  │ │  Stock  │ │ Shipment │ │  Supplier  │ │  Daily   │
   │ Lookup │ │  Check  │ │  Status  │ │ Mail Draft │ │ Briefing │
   └───┬────┘ └────┬────┘ └────┬─────┘ └─────┬──────┘ └────┬─────┘
       │          │           │             │             │
       └──────────┴───────────┼─────────────┴─────────────┘
                              ▼
                  ┌───────────────────────┐
                  │   SQLite (esnaf.db)   │
                  │ products / customers  │
                  │ orders / order_items  │
                  │ shipments / alerts    │
                  └───────────────────────┘
```

## Yapay Zeka Yaklaşımı

### Multi-Agent Orchestration

Tek bir "her şeyi bilen" prompt yerine, sorumluluk **küçük + iyi tanımlı tool'lara** dağıtılmıştır. Bu, modüler bir agent mimarisi sağlar:

| Tool | Görev | DB İşlemi |
|------|-------|-----------|
| `lookup_order` | Sipariş detayları, ürünler, kargo | `SELECT` orders + items + shipment |
| `check_stock` | Bulanık ürün arama, stok durumu | `SELECT` products `WHERE name LIKE` |
| `track_shipment` | Kargo izleme, gecikme tespiti | `SELECT` shipments `WHERE delayed` |
| `draft_supplier_email` | AI-destekli mail taslağı + miktar tahmini | `SELECT` 14 günlük satış, hesaplama |
| `daily_briefing` | Operasyon özeti, top satıcılar | `GROUP BY` + agregasyonlar |

### Function Calling Loop (Manuel)

SDK'nın otomatik function calling'i Gemini API'nın geçici 503/429 hatalarında bozulduğu için **manuel loop** uyguladık. Bu, **her HTTP çağrısının bağımsız retry edilebilmesini** sağlar:

```python
for round in range(MAX_TOOL_ROUNDS):
    response = call_gemini_with_retry(contents, tools)
    function_calls = extract_function_calls(response)
    if not function_calls:
        return response.text  # final cevap
    for fc in function_calls:
        result = execute_tool(fc.name, fc.args)
        append_function_response(contents, fc.name, result)
```

**Avantajlar:**
- Tool sonuçları **loglanabilir** (şeffaflık → UI'da "araç kullanıldı" rozetleri)
- Her network çağrısı **ayrı retry** alır (Gemini free tier 503'leri normaldir)
- Model **fallback chain**: 2.5-flash-lite → 2.0-flash → 2.0-flash-lite → 2.5-flash. Quota dolduğunda otomatik geçer.
- Maliyet kontrolü: tool sayısı / round sınırı belirli.

### Rol-Bazlı Tool Setleri

| Audience | Tool seti | Sistem prompt odağı |
|----------|-----------|---------------------|
| **Customer** | `lookup_order`, `check_stock`, `track_shipment` | Sıcak, kibar, kısa cevaplar |
| **Owner** | Tümü (5 tool) | Profesyonel, sayısal, içgörü ekle |

Bu ayrım, müşteriye `daily_briefing` gibi yanlış tool'ların önerilmesini engeller ve modelin kafasını karıştırmaz.

### Sistem Prompt Tasarımı

Her audience için ayrı prompt — kuralları **MUTLAKA** vurgular (Türkçe modelin hallucination eğilimini azaltır):

```
Kurallar:
- Müşteri sipariş numarası verirse MUTLAKA lookup_order aracını çağır.
- Aracın döndürdüğü veriyi DOĞRU kabul et, asla "ulaşamıyorum" deme.
- Para: TL. Tarihler: 12.05.2026 formatı.
```

## Veri Modeli

```sql
products(id, name, sku, category, stock, low_stock_threshold,
         price, unit, supplier_name, supplier_email, description)

customers(id, name, phone, email, city)

orders(id, customer_id, status, total, created_at, notes)
  status ∈ {pending, preparing, shipped, delivered, cancelled}

order_items(id, order_id, product_id, qty, unit_price)

shipments(id, order_id, carrier, tracking_no, status,
          last_update, eta, delayed, notes)
  status ∈ {label_created, picked_up, in_transit,
           out_for_delivery, delivered, exception}

stock_alerts(id, product_id, created_at, resolved, message)

chat_logs(id, role, audience, content, tool_name, created_at)
```

35 ürün (sebze/meyve, zeytin, süt ürünleri, bakliyat, reçel, bitkisel, el sanatları, kuruyemiş kategorileri); 20 müşteri (Türkiye geneli); 110 sipariş (son 14 gün, dağıtım dağılımı gerçekçi); 99 kargo kaydı (gecikme oranları gerçekçi).

## Frontend

- **Next.js 14 App Router**, TypeScript, Tailwind CSS, lucide-react ikonlar
- 2 ayrı arayüz:
  - `/` — Müşteri chat: WhatsApp benzeri tasarım, gerçek mesajlaşma deneyimini taklit eder
  - `/dashboard` — İşletmeci paneli: KPI kartları, AI brifingi, kritik stok uyarıları (tedarikçi maili one-click), gecikmiş kargolar, top 5 satan, son siparişler, embedded AI chat
- Markdown render (`react-markdown` + `remark-gfm`) → AI tablolar, listeler basabilir
- Tool kullanım rozetleri → AI'ın hangi aracı kullandığını şeffaf gösterir

## Hata ve Süreklilik Stratejisi

3-katmanlı resilience: hiçbir senaryoda demo durmaz.

| Katman | Tetikleyici | Davranış |
|--------|-------------|----------|
| 1. Retry + model fallback | Gemini 503 (overload) | 1.5s + retry, sonra `2.0-flash` |
| | Gemini 429 (quota) | Modeli atla, fallback'e geç |
| 2. Tool-result synth | Tool çağrıldı ama final synthesis çağrısı başarısız | `fallback_synth.py` Türkçe rendering: sipariş, stok, kargo bilgisi templated cevap olur |
| 3. Keyword router | Gemini hiç yanıt vermedi (tüm modeller down) | `keyword_router.py` mesajdaki anahtar kelimelerden niyet tespit eder, doğru tool'u doğrudan çağırır, Tier-2 synth ile cevap üretir |
| Tool exception | Bilinmeyen hata | `{"error": ...}` döndür, model/synth bunu özetler |
| MAX_TOOL_ROUNDS aşımı | Sonsuz döngü olasılığı | Kibar Türkçe hata mesajı |

API response'unda `fallback` alanı hangi katmanın devreye girdiğini gösterir (`null` / `synth_from_results` / `keyword_route`).

## Ölçeklenebilirlik

Yeni özellik eklemek = yeni Python fonksiyonu yazmak. Sistem prompt'a kural eklemeden bile model fonksiyonun docstring'ini anlar.

Production'a alındığında:
- SQLite → PostgreSQL (aynı SQLAlchemy modelleri)
- WhatsApp adapter (Twilio veya WA Business API) → `/chat/customer` aynı protokolde
- SMTP entegrasyonu (mail taslağı → gerçek gönderim)
- Tedarikçi sistemleri ile API entegrasyonu
- Caching katmanı (Redis) — dashboard summary ve brifing için
- Auth (FastAPI Users veya Clerk)

Tüm bunlar mimariye dokunmadan eklenebilir.
