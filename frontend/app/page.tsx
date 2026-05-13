import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  Github,
  LayoutDashboard,
  MessageCircle,
  Package,
  Sparkles,
  TrendingUp,
  Truck,
  Wand2,
  Zap,
} from "lucide-react";
import Logo from "@/components/Logo";


const FEATURES = [
  {
    icon: MessageCircle,
    title: "Müşteri Asistanı",
    desc: "Sipariş ve kargo sorularına WhatsApp tarzı arayüzde anında cevap verir.",
    color: "from-emerald-100 to-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: Package,
    title: "Sipariş & Stok Takibi",
    desc: "Veritabanından gerçek zamanlı sorgu — dağınık excel'lere son.",
    color: "from-sky-100 to-sky-50 text-sky-700 border-sky-200",
  },
  {
    icon: Truck,
    title: "Kargo İzleme",
    desc: "Gecikmeli kargoları otomatik tespit eder, proaktif uyarı çıkarır.",
    color: "from-rose-100 to-rose-50 text-rose-700 border-rose-200",
  },
  {
    icon: Boxes,
    title: "Akıllı Stok Yönetimi",
    desc: "Kritik eşik altına düşen ürünler için AI ile tedarikçi mail taslağı.",
    color: "from-amber-100 to-amber-50 text-amber-700 border-amber-200",
  },
  {
    icon: TrendingUp,
    title: "Analitik Brifing",
    desc: "Sabah AI tarafından üretilmiş günlük operasyon özeti panele düşer.",
    color: "from-violet-100 to-violet-50 text-violet-700 border-violet-200",
  },
  {
    icon: Wand2,
    title: "Çoklu-Ajan Mimari",
    desc: "Gemini 2.5 orchestrator + 6 uzman tool. Modüler, ölçeklenebilir.",
    color: "from-brand-100 to-brand-50 text-brand-700 border-brand-200",
  },
];


const STATS = [
  { value: "2-3 sa", label: "Günde tasarruf", subtitle: "müşteri sorularına" },
  { value: "5", label: "Uzman ajan", subtitle: "function calling ile" },
  { value: "%70+", label: "Otomasyon", subtitle: "operasyonel görevlerde" },
  { value: "<5 sn", label: "Yanıt süresi", subtitle: "ortalama" },
];


const FLOW = [
  { step: "1", title: "Müşteri WhatsApp'tan sorar", text: "\"5 numaralı siparişim ne durumda?\"" },
  { step: "2", title: "Orchestrator Agent karar verir", text: "Gemini hangi tool'u çağıracağını seçer" },
  { step: "3", title: "Tool veritabanını sorgular", text: "lookup_order(5) → sipariş, ürünler, kargo" },
  { step: "4", title: "AI doğal Türkçe cevap üretir", text: "Kibar, kısa, aksiyon önerir" },
];


export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-emerald-50/40 to-amber-50/30">
      {/* Top nav */}
      <nav className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={38} />
            <div>
              <div className="font-bold text-slate-900 tracking-tight leading-none">
                Çırak<span className="text-emerald-600">.</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-none mt-0.5">
                AI Operasyon Asistanı
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#ozellikler" className="hover:text-slate-900 transition-colors">Özellikler</a>
            <a href="#nasil-calisir" className="hover:text-slate-900 transition-colors">Nasıl Çalışır?</a>
            <a href="#mimari" className="hover:text-slate-900 transition-colors">Mimari</a>
            <a
              href="https://github.com/ataabeeyzaa/esnaf-ai"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
            >
              <Github size={14} /> GitHub
            </a>
          </div>
          <Link
            href="/chat"
            className="hidden md:inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            Demo'yu dene
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-12 md:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-300 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium mb-5 shadow-sm">
                <Sparkles size={12} />
                YZTA 5.0 Hackathon · AI Kategorisi
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]">
                Esnafın <span className="text-emerald-600">yapay zeka çırağı</span>
              </h1>

              <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-xl">
                <span className="text-slate-900 font-semibold">Çırak</span>, KOBİ ve kooperatifler için
                çoklu-ajan AI'la çalışır: müşteri sorularına anında cevap verir, stok-kargo takibi yapar,
                tedarikçi mailini hazırlar ve günlük brifing üretir. Tek bir{" "}
                <span className="text-slate-900 font-semibold">Gemini 2.5</span> destekli sistemde.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="group inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                >
                  <MessageCircle size={18} />
                  Müşteri Chat'i Aç
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-medium px-5 py-3 rounded-xl border border-slate-300 shadow-sm transition-all hover:scale-[1.02]"
                >
                  <LayoutDashboard size={18} />
                  İşletmeci Panelini Aç
                </Link>
                <Link
                  href="/whatsapp-demo"
                  className="group inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-700 font-medium px-5 py-3 rounded-xl border border-emerald-300 shadow-sm transition-all hover:scale-[1.02]"
                >
                  <Wand2 size={18} />
                  WhatsApp Demo
                </Link>
                <Link
                  href="/supplier-portal"
                  className="group inline-flex items-center gap-2 bg-white hover:bg-violet-50 text-violet-700 font-medium px-5 py-3 rounded-xl border border-violet-300 shadow-sm transition-all hover:scale-[1.02]"
                >
                  <Boxes size={18} />
                  Tedarikçi Portalı
                </Link>
                <Link
                  href="/carrier-portal"
                  className="group inline-flex items-center gap-2 bg-white hover:bg-sky-50 text-sky-700 font-medium px-5 py-3 rounded-xl border border-sky-300 shadow-sm transition-all hover:scale-[1.02]"
                >
                  <Truck size={18} />
                  Kargo Paneli
                </Link>
                <a
                  href="https://github.com/ataabeeyzaa/esnaf-ai"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-3 rounded-xl shadow-sm transition-all hover:scale-[1.02]"
                >
                  <Github size={18} />
                  GitHub
                </a>
              </div>

              {/* Stats row */}
              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{s.value}</div>
                    <div className="text-xs text-slate-700 font-medium mt-0.5">{s.label}</div>
                    <div className="text-[11px] text-slate-500">{s.subtitle}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual mock card */}
            <div className="relative">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-200/40 rounded-full blur-3xl" />
              <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-brand-200/40 rounded-full blur-3xl" />

              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Mock chat header */}
                <div className="bg-emerald-50 px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                  <Logo size={36} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      Çırak
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
                        çevrimiçi
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">Gemini 2.5 · 6 ajan tool</div>
                  </div>
                </div>

                {/* Mock messages */}
                <div className="p-5 space-y-2.5 bg-stone-50/50 min-h-[280px]">
                  <div className="flex justify-end">
                    <div className="bg-emerald-100 text-slate-800 text-sm rounded-lg rounded-tr-sm px-3 py-2 max-w-[80%] shadow-bubble">
                      5 numaralı siparişim ne durumda?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-800 text-sm rounded-lg rounded-tl-sm px-3 py-2 max-w-[88%] shadow-bubble">
                      <div className="mb-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium px-2 py-0.5">
                          <Zap size={9} />
                          Sipariş sorgulandı
                        </span>
                      </div>
                      📦 <strong>5 numaralı siparişiniz</strong>: <strong>Kargoya verildi</strong>.
                      <br />
                      MNG Kargo, takip no <code className="bg-slate-100 px-1 rounded text-[11px]">MN8647...</code>
                      <br />
                      Tahmini teslim: <strong>10.05.2026</strong> ⚠️ kargo merkezi gecikmesi.
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-emerald-100 text-slate-800 text-sm rounded-lg rounded-tr-sm px-3 py-2 max-w-[80%] shadow-bubble">
                      Köy balı stokta var mı?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-800 text-sm rounded-lg rounded-tl-sm px-3 py-2 max-w-[88%] shadow-bubble">
                      <div className="mb-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium px-2 py-0.5">
                          <Zap size={9} />
                          Stok kontrol edildi
                        </span>
                      </div>
                      ✅ <strong>Köy Bal (1 kg)</strong> stokta: <strong>25 kavanoz</strong>.
                      <br />
                      Fiyat: 320,00 ₺/kavanoz.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem callout */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-brand-600 mb-2">Problem</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Manuel iş yükü işletmeyi yoruyor</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                KOBİ sahipleri günde 2-3 saatlerini "siparişim nerede?", "X var mı?" sorularına ayırıyor.
                Stok tükendiğinde fark ediyor, kargo gecikmelerini müşteri şikayetinden öğreniyor.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-emerald-600 mb-2">Çözüm</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Çoklu-ajan otomasyon katmanı</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Çırak, müşteriye doğrudan cevap verir, sipariş-stok-kargo verisine bağlanır,
                kritik durumlarda işletmeciyi proaktif bilgilendirir ve aksiyon önerir.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-sky-600 mb-2">Hedef Kitle</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Kooperatifler & butik e-ticaret</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                20-200 ürün, günde 10-100 sipariş işleyen tarım kooperatifleri, gıda üreticileri,
                hibrit mağaza+online işletmeler için optimize edildi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ozellikler" className="max-w-6xl mx-auto px-4 md:px-6 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full mb-3">
            <Sparkles size={12} />
            Özellikler
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Tek üründe altı operasyon alanı
          </h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Müşteri iletişimi, sipariş, kargo, stok, iş akışı ve analitik — hepsi tek bir{" "}
            <span className="text-slate-900 font-semibold">çoklu-ajan</span> sistemde.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`bg-gradient-to-br ${f.color} border rounded-2xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5`}
            >
              <div className="w-10 h-10 rounded-lg bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-sm">
                <f.icon size={20} />
              </div>
              <div className="mt-3 font-semibold text-slate-900">{f.title}</div>
              <div className="mt-1.5 text-sm text-slate-700 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="nasil-calisir" className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-brand-700 bg-brand-100 border border-brand-200 px-3 py-1 rounded-full mb-3">
              <Wand2 size={12} />
              Akış
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Soru sorulduktan cevaba kadar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {FLOW.map((step, i) => (
              <div key={step.step} className="relative">
                <div className="bg-stone-50 border border-slate-200 rounded-2xl p-5 h-full">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shadow-sm">
                    {step.step}
                  </div>
                  <div className="mt-3 font-semibold text-slate-900">{step.title}</div>
                  <div className="mt-1 text-sm text-slate-600 leading-snug">{step.text}</div>
                </div>
                {i < FLOW.length - 1 && (
                  <ArrowRight
                    size={18}
                    className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-emerald-500 z-10"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="mimari" className="max-w-6xl mx-auto px-4 md:px-6 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-sky-700 bg-sky-100 border border-sky-200 px-3 py-1 rounded-full mb-3">
            <Bot size={12} />
            Mimari
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Multi-Agent + Function Calling
          </h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Tek prompt yerine her tool küçük + iyi tanımlı sorumluluğa sahip. Modüler, test edilebilir,
            ölçeklenebilir.
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 md:p-10 overflow-hidden">
          <pre className="text-emerald-300 text-[11px] md:text-[13px] leading-relaxed font-mono overflow-x-auto">
{`            ┌──────────────────────────┐
            │  Müşteri Chat (Whatsapp) │   ┌─── İşletmeci Dashboard
            └────────────┬─────────────┘   │       (KPI + AI brifing)
                         │                 │
                         └────────┬────────┘
                                  │ HTTP
                                  ▼
                       ┌──────────────────┐
                       │   FastAPI App    │
                       └────────┬─────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │   Orchestrator Agent       │
                  │   (manuel FC loop +        │
                  │    keyword fast-path)      │
                  └────────────┬───────────────┘
                               │
                  ┌────────────┴─────────────┐
                  ▼                          ▼
            ┌──────────┐              ┌──────────────┐
            │ Gemini 2.5 │            │ Keyword Router│
            │ function-  │            │ (zero-LLM     │
            │ calling    │            │  fast path)   │
            └─────┬──────┘            └──────┬───────┘
                  │                          │
       ┌──────────┼──────────┐               │
       ▼          ▼          ▼               │
  ┌─────────┐ ┌────────┐ ┌─────────┐         │
  │  order  │ │  stock │ │ shipment│  ...    │
  │ lookup  │ │  check │ │  status │         │
  └────┬────┘ └────┬───┘ └────┬────┘         │
       └───────────┴──────────┴──────────────┘
                    │
                    ▼
            ┌────────────────┐
            │   SQLite DB    │
            │ products/orders│
            │ shipments/...  │
            └────────────────┘`}
          </pre>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="text-emerald-700 font-semibold flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} />
              3-Katmanlı Resilience
            </div>
            <div className="mt-2 text-xs text-slate-700 leading-relaxed">
              Gemini quota tükenince keyword router devreye girer, demo hep çalışır.
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="text-emerald-700 font-semibold flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} />
              Şeffaf Tool Kullanımı
            </div>
            <div className="mt-2 text-xs text-slate-700 leading-relaxed">
              UI'da "Sipariş sorgulandı" rozetleri AI'ın hangi aracı kullandığını gösterir.
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="text-emerald-700 font-semibold flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} />
              Aksiyon Alabilen Sistem
            </div>
            <div className="mt-2 text-xs text-slate-700 leading-relaxed">
              Sadece bilgi vermez — tedarikçi maili hazırlar, brifing üretir, uyarı çıkarır.
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-brand-500 text-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Demo'ya başlamaya hazır mısın?</h2>
          <p className="mt-3 text-emerald-50 max-w-xl mx-auto">
            Müşteri chat'i ve işletmeci panelini canlı veriyle dene. Tüm kodlar GitHub'da açık.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-700 font-semibold px-6 py-3 rounded-xl shadow-lg transition-all hover:scale-[1.02]"
            >
              <MessageCircle size={18} />
              Müşteri Chat
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all hover:scale-[1.02]"
            >
              <LayoutDashboard size={18} />
              İşletmeci Paneli
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span>Çırak · YZTA 5.0 Hackathon</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/ataabeeyzaa/esnaf-ai"
              target="_blank"
              rel="noopener"
              className="hover:text-white inline-flex items-center gap-1.5"
            >
              <Github size={14} /> GitHub
            </a>
            <span className="text-slate-700">·</span>
            <span>Geliştirici: <a href="https://github.com/ataabeeyzaa" className="hover:text-white">ataabeeyzaa</a></span>
          </div>
        </div>
      </footer>
    </main>
  );
}
