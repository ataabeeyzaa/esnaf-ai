# ESNAF AI — Design Spec

**Tarih:** 2026-05-12
**Hackathon:** YZTA 5.0 — AI Geliştirme Hackathon
**Teslim:** 2026-05-13 23:59
**Geliştirici:** ataabeeyzaa (solo)

---

## 1. Problem & Değer Önerisi

Küçük ve orta ölçekli işletmeler (KOBİ'ler) ve kooperatifler günde 2-3 saatlerini "siparişim nerede?", "bu ürün stokta var mı?" gibi tekrar eden sorulara cevap vererek kaybediyor. Stok tükendiğinde fark ediyorlar, kargo gecikmelerini müşteri şikayetinden öğreniyorlar.

**ESNAF AI**, bu işlemleri tek bir çoklu-ajan sistemle uçtan uca otomatize eder:
- Müşterinin sorusuna doğal dilde anında cevap verir (sipariş durumu, stok, kargo)
- İşletmeciye proaktif uyarı yapar (stok azaldı, kargo gecikti)
- Aksiyon alır: tedarikçiye taslak mail hazırlar, günlük brifing üretir, satış öngörüsü çıkarır

**Hedef kitle:** 20-200 ürünlü, günde 10-100 sipariş işleyen butik e-ticaret, tarım kooperatifleri, hibrit mağaza+online işletmeler.

---

## 2. Yapay Zeka Yaklaşımı

### Mimari: Multi-Agent (Orchestrator + Specialists)

```
                    ┌──────────────────────┐
   User Message ───▶│  Orchestrator Agent  │  (Gemini 2.5 Flash + function calling)
                    └──────────┬───────────┘
                               │ routes to tools
        ┌──────────┬───────────┼───────────┬──────────────┐
        ▼          ▼           ▼           ▼              ▼
  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐
  │  Order   │ │ Stock  │ │ Shipment │ │  Mail  │ │   Analytics  │
  │  Lookup  │ │ Check  │ │  Status  │ │ Drafter│ │  & Briefing  │
  └────┬─────┘ └───┬────┘ └─────┬────┘ └───┬────┘ └──────┬───────┘
       │           │            │           │             │
       └───────────┴────────────┼───────────┴─────────────┘
                                ▼
                        ┌───────────────┐
                        │  SQLite DB    │
                        │ (orders,      │
                        │  products,    │
                        │  customers,   │
                        │  shipments)   │
                        └───────────────┘
```

### Neden Multi-Agent?

- Tek bir prompt'a 10 farklı işlemi tıkıştırmak yerine, her agent **küçük + iyi tanımlı** sorumluluğa sahip
- Orchestrator **Gemini function calling** ile hangi tool'u çağıracağını seçer (RAG benzeri ama yapılandırılmış)
- Yeni özellik eklemek = yeni tool eklemek (genişletilebilir mimari)

### LLM: Gemini 2.5 Flash
- Hız: <1s response (demo için kritik)
- Function calling native destekli
- Ücretsiz tier'da 36 saatte bitmez

---

## 3. Sistem Bileşenleri

### Backend (FastAPI + Python 3.11)

**`backend/app/`**
- `main.py` — FastAPI app, CORS, route mounting
- `db.py` — SQLAlchemy + SQLite bağlantısı
- `models.py` — Product, Customer, Order, OrderItem, Shipment, StockAlert
- `seed.py` — 50 ürün, 20 müşteri, 100 sipariş, 30 kargo logu mock data
- `agents/orchestrator.py` — Ana agent, Gemini ile konuşur, tool seçer
- `agents/tools.py` — 5 tool fonksiyonu (her biri DB query + iş mantığı)
- `routes/chat.py` — `/chat/customer`, `/chat/owner` endpoints
- `routes/dashboard.py` — `/dashboard/summary`, `/dashboard/alerts`
- `schemas.py` — Pydantic request/response modelleri

**Tool'ların imzaları (Gemini function calling için):**
1. `lookup_order(order_id: int, customer_phone: str | None)` → sipariş + ürünler + kargo durumu
2. `check_stock(product_query: str)` → ürün stok durumu, fuzzy search
3. `track_shipment(order_id: int)` → kargo durumu, gecikme tespiti, ETA
4. `draft_supplier_email(product_id: int, suggested_qty: int)` → tedarikçi maili taslağı
5. `daily_briefing(date: str | None)` → günlük özet (yeni siparişler, kritik stok, gecikmiş kargolar, top satıcılar)

### Frontend (Next.js 14 + Tailwind + shadcn/ui)

**Sayfa 1: `/` — Customer Chat (WhatsApp tarzı)**
- Sol: sahte "kontak" listesi (görsel için)
- Sağ: aktif sohbet — müşteri mesajları yeşil baloncuk, AI cevapları beyaz
- "Hızlı sorular" butonları: "Siparişim nerede?", "X ürünü var mı?", "İade nasıl?"

**Sayfa 2: `/dashboard` — İşletmeci Paneli**
- Üst: KPI kartları (bugünkü sipariş, gecikmiş kargo, kritik stok, gelir)
- Sol: AI Asistan chat ("bu hafta en çok satan?", "stokta azalanları listele")
- Sağ: 3 panel
  - **Sabah Brifingi** (AI tarafından üretilmiş özet metin)
  - **Stok Uyarıları** (kritik seviyedeki ürünler + "Tedarikçi maili oluştur" butonu)
  - **Gecikmiş Kargolar** (otomatik tespit + "Müşteriyi bilgilendir" butonu)

### Veri Modeli (SQLite)

```
products:    id, name, sku, stock, low_stock_threshold, price, supplier_email
customers:   id, name, phone, email
orders:      id, customer_id, status (pending/preparing/shipped/delivered), created_at, total
order_items: id, order_id, product_id, qty, unit_price
shipments:   id, order_id, carrier, tracking_no, status, last_update, eta, delayed (bool)
stock_alerts: id, product_id, created_at, resolved (bool)
```

---

## 4. Demo Senaryoları (Video İçin Script)

**Senaryo 1 (15 sn):** Müşteri chat'i açar, "Merhaba, 1042 numaralı siparişim ne durumda?" yazar. AI siparişi DB'den çeker, 2 ürün olduğunu, kargonun yarın geleceğini söyler.

**Senaryo 2 (15 sn):** Dashboard'da kırmızı uyarı: "Organik domates stoku 12 kg (kritik: 50)". "Tedarikçi maili oluştur" tıklanır → AI, geçmiş 2 haftalık satışa bakarak 200 kg öneriyle taslak mail üretir.

**Senaryo 3 (15 sn):** Dashboard "Sabah Brifingi" panelinde AI'ın yazdığı özet: "Bu gece 12 yeni sipariş geldi, toplam 4.230 TL. 3 kargo gecikme uyarısında — proaktif bilgilendirme önerilir. Bu hafta zeytinyağı %40 arttı, stok kontrolü yap."

**Senaryo 4 (15 sn):** İşletmeci chat'e yazar "bu hafta en çok satan 5 ürün?". AI analitik tool'unu çağırır, tablo gibi listeler.

---

## 5. Klasör Yapısı

```
esnaf-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── db.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── seed.py
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py
│   │   │   └── tools.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── chat.py
│   │       └── dashboard.py
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Customer chat
│   │   ├── dashboard/page.tsx    # Owner dashboard
│   │   └── api/                  # Next API proxies (optional)
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── KpiCard.tsx
│   │   └── AlertPanel.tsx
│   ├── lib/api.ts
│   ├── package.json
│   └── tailwind.config.ts
├── docs/
│   ├── specs/2026-05-12-esnaf-ai-design.md   (this file)
│   └── architecture.md
├── scripts/
│   ├── start_dev.sh              # Backend + frontend birlikte başlat
│   └── reset_db.sh               # DB sil + seed çalıştır
├── .env.example
├── .gitignore
└── README.md
```

---

## 6. Kapsam-Dışı (YAGNI)

Yapılmayacaklar — net olsun, scope creep'i önler:

- Gerçek WhatsApp/Telegram entegrasyonu (web chat UI taklit eder)
- Gerçek SMTP mail gönderimi (taslak ekranda gösterilir)
- Auth/login (demo prototip)
- Production deploy (localhost'ta çalışır; opsiyonel olarak Vercel/Render denenir)
- Multi-tenant / kullanıcı yönetimi
- Ödeme entegrasyonu

---

## 7. Risk & Mitigation

| Risk | Etki | Mitigation |
|------|------|------------|
| Gemini API rate limit | Demo durur | Free tier yeterli (15 RPM). Cache + retry. |
| Next.js + FastAPI CORS | Frontend bağlanmaz | CORSMiddleware ile `*` allow (dev) |
| 36 saat yetmemesi | Eksik teslim | MVP önce: backend + 1 chat sayfası çalışsın, dashboard ikinci öncelik |
| Function calling karmaşası | Yanlış tool çağrısı | Tool schema'larında net description + few-shot örnekler |

---

## 8. Başarı Kriteri

- Backend `uvicorn` ile tek komutla ayağa kalkar
- Frontend `npm run dev` ile tek komutla ayağa kalkar
- README'deki 4 senaryo demo'da sorunsuz çalışır
- Gemini function calling **görünür** şekilde tetiklenir (loglarda "tool: order_lookup called")
- Mimari diagram + AI yaklaşımı README'de detaylı anlatılır

---

## 9. Build Sırası (36 saat planı)

| Saat | İş |
|------|-----|
| 0-1 | Spec onayı + repo açılışı + ortam |
| 1-4 | Backend iskelet: FastAPI, modeller, DB, seed |
| 4-8 | Orchestrator + 5 tool + chat endpoint |
| 8-10 | Test: curl ile 4 senaryo doğrula |
| 10-16 | Frontend: customer chat sayfası |
| 16-22 | Frontend: dashboard + alerts + brifing |
| 22-26 | UI polish + Tailwind + animasyon |
| 26-30 | Mimari diagram + README + AI açıklaması |
| 30-34 | Demo video kayıt + montaj |
| 34-36 | YouTube upload + GitHub son commit + form |
