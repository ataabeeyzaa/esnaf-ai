# Demo Video — 1 Dakikalık Script & Kayıt Rehberi

YZTA 5.0 Hackathon AI kategorisi için **YouTube'a yüklenecek 60 saniyelik** demo videosu.

## ⏱️ Süre Bütçesi (toplam ≤ 60 sn)

| Saniye | İçerik | Görsel |
|--------|--------|--------|
| 0:00-0:05 | Açılış: **Landing sayfası** (`/`) — hero görünüyor, "KOBİ'ler için çoklu-ajan operasyon asistanı" başlığı | localhost:3000/ |
| 0:05-0:20 | **Senaryo 1**: "Müşteri Chat" CTA'sına tıkla → WhatsApp arayüzü → "5 numaralı siparişim?" sorusu → AI tool kullanıp cevap | `/chat` |
| 0:20-0:35 | **Senaryo 2**: "Panel" butonuna → Dashboard → KPI sayıcılar animasyonla artıyor + sparkline trendler + AI brifingi | `/dashboard` |
| 0:35-0:48 | **Senaryo 3**: Kritik stok satırında "Tedarikçi maili" → AI mail taslağı modal'ı açılıyor | Supplier modal |
| 0:48-0:55 | **Senaryo 4**: Son siparişlerden birine tıkla → Sipariş detay modal'ı + kargo timeline'ı | Order modal |
| 0:55-0:60 | Kapanış: GitHub URL + "esnaf-ai.vercel.app" canlı link (varsa) | Statik kart |

## 🎙️ Türkçe Voice-over Metni (yaklaşık 130 kelime)

> [0:00] **ESNAF AI** — kooperatifler ve KOBİ'ler için yapay zeka asistanı. Müşteri sorularını otomatik cevaplar, stok ve kargoyu izler, tedarikçi maillerini hazırlar.
>
> [0:05] Müşteri WhatsApp tarzı arayüzde sipariş numarasını yazıyor. Sistem **Gemini function calling** ile gerçek veritabanından sorguluyor, kargo durumunu, varsa gecikmeyi ve teslim tarihini saniyeler içinde söylüyor.
>
> [0:20] İşletmeci paneline bakıyoruz. KPI kartları, sabah brifingi, kritik stok uyarıları, gecikmiş kargolar tek ekranda. Brifingi **AI dinamik olarak üretiyor**.
>
> [0:32] Kritik stoktaki organik domatese tıklıyoruz. AI son 14 günlük satışı analiz edip 2 haftalık miktar öneriyor ve **tedarikçi mail taslağını Türkçe** hazırlıyor — tek tıkla kopyala ve gönder.
>
> [0:45] İşletmeci yapay zekaya "bu hafta en çok satan beş ürün" diye soruyor. AI agregasyon tool'unu çağırıp sıralı tablo veriyor.
>
> [0:55] Kodlar **github.com/ataabeeyzaa/esnaf-ai** açık. Teşekkürler.

## 📋 Hazırlık Checklist'i (kayıt öncesi)

- [ ] Backend ayağa kalkmış: `cd backend && uvicorn app.main:app --reload`
- [ ] Frontend ayağa kalkmış: `cd frontend && npm run dev`
- [ ] DB seed atılmış: `python -m app.seed` (35 ürün, 110 sipariş)
- [ ] Tarayıcıda 2 sekme açık: `localhost:3000/` ve `localhost:3000/dashboard`
- [ ] Tarayıcı zoom %110-120 (yazılar net görünsün)
- [ ] Tarayıcı tam ekran (F11)
- [ ] OBS Studio veya Windows oyun çubuğu (Win+G) hazır
- [ ] Mikrofonu test et — gürültü yok
- [ ] Eğer Gemini quota dolduysa: 60 sn bekleyip tekrar dene (per-minute reset)
- [ ] Chrome DevTools açık DEĞİL
- [ ] Bildirimleri kapat (Windows Focus Assist açık)

## 🎬 Kayıt Adımları

1. **Aç**: OBS → Yeni sahne → Display Capture → Tarayıcı penceresi.
2. **Ses**: Mikrofon eklenmiş olsun. Test kaydı yap.
3. **Kaydet**: Aşağıdaki tıklama sırası ile 1 deneme yap, sonra gerçek kayıt:

### Tıklama Sırası

**Sekme 1 (müşteri chat — `localhost:3000`):**
- Sayfayı yenile
- "5 numaralı siparişim ne durumda?" hızlı sorusuna tıkla → AI cevabını bekle (3-5 sn)
- "Köy balı stokta var mı?" sorusunu yaz veya hızlı butona tıkla
- AI cevabını bekle

**Sekme 2 (dashboard — `localhost:3000/dashboard`):**
- Sekmeyi geç, KPI kartlarını panoramik göster (mouse'u üzerlerine getir)
- AI brifing panelindeki metni göster
- Kritik stok listesinde **Organik Domates** satırındaki "Tedarikçi maili" butonuna tıkla
- Modal açılınca: mevcut stok / önerilen miktar / mail gövdesini göster
- Modal'ı kapat
- Sağdaki AI chat'e tıkla → "Bu hafta en çok satan 5 ürün?" yaz, Enter
- Cevap gelene kadar bekle (typing göstergesi görünür)
- Tablo cevabını göster

**Bitiş:**
- README'yi aç ya da terminal'de `gh repo view ataabeeyzaa/esnaf-ai --web` çalıştır
- "ataabeeyzaa/esnaf-ai" başlığı görünsün

### 🔁 Hız İpuçları

- Browser zoom artırırsan yazılar net görünür ama her şey sığar.
- AI cevabı yavaş gelirse, **video düzenlemede 1.25x hız** uygula (Premiere/CapCut/DaVinci).
- Voice-over'ı **sonradan** ekle, daha temiz olur. Önce sessiz ekran kaydı, sonra dublaj.

## 🛠️ Önerilen Araçlar

| Araç | Ne için | Bedava mı |
|------|---------|-----------|
| **OBS Studio** | Ekran kaydı | Evet |
| **Windows Game Bar (Win+G)** | Hızlı kayıt | Evet (Win 10+) |
| **DaVinci Resolve** | Montaj + voice-over | Evet |
| **CapCut Desktop** | Hızlı montaj, mobil-uyumlu | Evet |
| **Audacity** | Voice-over kaydı + temizleme | Evet |

## 📤 Upload

1. YouTube → Yükle → **Unlisted** (gizli, linkten erişilir)
2. Başlık: `ESNAF AI - YZTA 5.0 Hackathon Demo`
3. Açıklama: README'deki "Çözüm" bölümü
4. Etiketler: `AI, Gemini, FastAPI, NextJS, Hackathon, YZTA`
5. **Linki teslim formuna ekle** (Slack)

## 🚨 Olası Sorunlar

| Sorun | Çözüm |
|-------|-------|
| Gemini "yoğunluk" cevabı veriyor | 60 sn bekle, retry. Backend `gemini-2.5-flash-lite` kullanıyor. |
| Dashboard brifing eski görünüyor | Sağ üstteki **Yenile** butonuna bas |
| Chat'te response yavaş | Free tier'da normal (2-5 sn). Video kurguda hızlandır. |
| Türkçe karakterler bozuk | Tarayıcı UTF-8 ✓. Sorunsa Chrome temiz kullan. |
| Backend down | `python -m app.seed` → `uvicorn app.main:app --reload` |
