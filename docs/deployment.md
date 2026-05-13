# Deployment Rehberi — Vercel + Render

ESNAF AI'yı **20 dakikada** canlıya alabilirsin. İki ücretsiz servis kullanıyoruz:

- **Render.com** → Backend (FastAPI + SQLite) → ücretsiz tier
- **Vercel** → Frontend (Next.js) → ücretsiz tier

Repo zaten public ([github.com/ataabeeyzaa/esnaf-ai](https://github.com/ataabeeyzaa/esnaf-ai)) ve `render.yaml` + `frontend/vercel.json` config dosyaları repoda hazır.

---

## 1. Backend Deploy (Render.com)

### Adım 1.1 — Render hesabı aç
1. [render.com](https://render.com) → **"Get Started for Free"**
2. **"Sign in with GitHub"** — `ataabeeyzaa` hesabınla bağla
3. GitHub'a repo erişimi onayla (sadece `esnaf-ai` repo'su yeterli)

### Adım 1.2 — Blueprint deploy
1. Render dashboard → **"New +"** → **"Blueprint"**
2. **"Connect a repository"** → `ataabeeyzaa/esnaf-ai` seç
3. Render otomatik olarak `render.yaml`'ı okur ve önizleme gösterir
4. **"Apply"** tıkla

### Adım 1.3 — GEMINI_API_KEY ekle
Deploy başlamadan önce env-var sorulur:
- `GEMINI_API_KEY` → [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)'dan al, yapıştır

⚠️ Eski paylaştığın key'i sil, yeni oluştur (sohbete yazdığın için artık güvenli sayılmaz).

### Adım 1.4 — Deploy bekle (~5 dk)
Render `requirements.txt`'i kurar, `python -m app.seed` çalıştırır, `uvicorn`'u başlatır. Logs'ta:

```
Build succeeded
Your service is live at https://esnaf-ai-backend-xxxx.onrender.com
```

URL'i kopyala. Test et:
```
https://esnaf-ai-backend-xxxx.onrender.com/health
→ {"status":"healthy"}
```

> 💡 **Free tier uyarısı:** Render ücretsiz servisleri 15 dakika trafik olmazsa "uyur". İlk istek 30-60 sn sürer. Demo için ilk önce tarayıcıdan health endpoint'ini açıp uyandır.

---

## 2. Frontend Deploy (Vercel)

### Adım 2.1 — Vercel hesabı aç
1. [vercel.com](https://vercel.com) → **"Sign Up"**
2. **"Continue with GitHub"** — `ataabeeyzaa` hesabınla bağla

### Adım 2.2 — Project import
1. Dashboard → **"Add New..."** → **"Project"**
2. `ataabeeyzaa/esnaf-ai` repo'sunu seç → **"Import"**
3. **"Root Directory"** → **"Edit"** → `frontend` yaz → **"Continue"**
4. Framework otomatik **"Next.js"** olarak algılanır ✓

### Adım 2.3 — Environment Variable ekle
**"Environment Variables"** bölümünde:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://esnaf-ai-backend-xxxx.onrender.com` _(Render'dan kopyaladığın URL)_ |

### Adım 2.4 — Deploy
**"Deploy"** tıkla. ~2 dk sonra:

```
🎉 Your project has been deployed
https://esnaf-ai.vercel.app
```

---

## 3. README'i Güncelle

`README.md`'nin tepesindeki **"Canlı Demo"** satırını güncelle:

```diff
- 🔗 Canlı Demo: _(deploy sonrası eklenecek)_
+ 🔗 Canlı Demo: https://esnaf-ai.vercel.app
```

Commit + push:

```bash
cd E:\HACKHATON\esnaf-ai
git add README.md
git commit -m "Add live demo URL to README"
git push
```

---

## 4. Demo Akışı (Jüri için)

Slack'teki ürün teslim formuna 3 link yaz:

| Alan | Link |
|------|------|
| GitHub repo | https://github.com/ataabeeyzaa/esnaf-ai |
| Canlı demo | https://esnaf-ai.vercel.app |
| Demo video | https://youtu.be/... _(YouTube'a yüklediğin)_ |

---

## 5. Olası Sorunlar

| Sorun | Çözüm |
|-------|-------|
| Render build "module not found" | `backend/requirements.txt` doğru mu? rootDir: backend ayarı işliyor mu? |
| Vercel "Module not found: lucide-react" | Vercel root directory = `frontend` ayarlandı mı? |
| Frontend chat çağırıyor ama 404 alıyor | `NEXT_PUBLIC_API_URL` Vercel env'inde Render URL'iyle aynı mı? |
| CORS hatası | Backend `main.py`'da `CORSMiddleware` zaten `allow_origins=["*"]` — sorun olmamalı |
| Gemini 429 (free tier) | Sistem zaten keyword-router fallback'iyle çalışır, demo bozulmaz |
| Render free tier "uyudu" | Demo öncesi `https://...onrender.com/health` aç, uyandır |

---

## 6. Pro İpucu — Custom Domain (opsiyonel, 10 dk)

Vercel projesinde **"Settings" → "Domains"** → kendi domainini bağla.
Örnek: `esnaf-ai.dev`, `beyzaata.com/esnaf` gibi.

Bu jüri için "ekstra çabaya" giriyor sayılır — opsiyonel.
