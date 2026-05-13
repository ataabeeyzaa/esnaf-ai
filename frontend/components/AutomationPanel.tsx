"use client";

import { useEffect, useState } from "react";
import { Bell, Boxes, Clock, Play, RefreshCw, Settings2, Sparkles, Truck } from "lucide-react";
import { getActivityFeed, triggerAutomationNow, type ActivityEvent } from "@/lib/api";
import { useToast } from "./Toast";

// Otomasyon ayarları sadece UI'da yaşıyor — gerçek bir background
// scheduler bu repoda yok. Toggle'lar "Çırak şu işi sabah otomatik
// yapacak" niyetinin görsel ifadesi; localStorage'da hatırlanıyor.
const AUTOMATION_DEFAULTS = {
  morning_briefing: true,
  delayed_notify: true,
  supplier_email: true,
};

type AutomationKey = keyof typeof AUTOMATION_DEFAULTS;

const AUTOMATION_META: Record<AutomationKey, { title: string; desc: string; time: string }> = {
  morning_briefing: {
    title: "Sabah brifingi",
    desc: "Günlük KPI, kritik durumlar ve top satıcıların özeti",
    time: "08:00",
  },
  delayed_notify: {
    title: "Gecikmiş kargo bildirimleri",
    desc: "Gecikme tespit edilen siparişlerin müşterilerine proaktif WhatsApp mesajı",
    time: "08:05",
  },
  supplier_email: {
    title: "Tedarikçi mail taslakları",
    desc: "Kritik stoktaki ürünler için 14 günlük satış bazlı miktar önerisi ile mail",
    time: "08:10",
  },
};

const STORAGE_KEY = "cirak_automation";

const ICON_MAP: Record<ActivityEvent["icon"], typeof Bell> = {
  send: Bell,
  sparkles: Sparkles,
  mail: Bell,
};

const CHANNEL_LABEL: Record<ActivityEvent["channel"], string> = {
  whatsapp: "WhatsApp",
  email: "E-posta",
  system: "Sistem",
};

const CHANNEL_STYLE: Record<ActivityEvent["channel"], string> = {
  whatsapp: "bg-emerald-100 text-emerald-800 border-emerald-300",
  email: "bg-sky-100 text-sky-800 border-sky-300",
  system: "bg-slate-100 text-slate-700 border-slate-300",
};

export default function AutomationPanel() {
  const [settings, setSettings] = useState(AUTOMATION_DEFAULTS);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState("");
  const [triggering, setTriggering] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw);
        setSettings({ ...AUTOMATION_DEFAULTS, ...stored });
      } catch {
        // ignore
      }
    }
  }, []);

  async function loadActivity() {
    setLoading(true);
    try {
      const r = await getActivityFeed(7);
      setEvents(r.items);
      setGeneratedAt(r.generated_at);
    } catch {
      // soft-fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
    // Canlı kanıt için periyodik polling — backend cron 90s'de bir
    // ChatLog'a yeni satır yazıyor; biz 15s'de bir feed'i çekiyoruz ki
    // demo videosu sırasında ekranda yeni satır canlı görünsün.
    const id = window.setInterval(loadActivity, 15000);
    return () => window.clearInterval(id);
  }, []);

  async function triggerNow() {
    setTriggering(true);
    try {
      const r = await triggerAutomationNow();
      if (r.written.length === 0) {
        toast.info(
          "Tetiklendi",
          "Bu tick'te yazılacak aksiyon yok — son 5 dakikada zaten yazılmış olabilir."
        );
      } else {
        toast.success("Otomasyon çalıştı", `Yeni aksiyon: ${r.written.join(", ")}`);
      }
      // Yeni kaydın hemen görünmesi için aktiviteyi yeniden çek
      await loadActivity();
    } catch (e) {
      toast.error("Tetikleme başarısız", String(e));
    } finally {
      setTriggering(false);
    }
  }

  function toggle(key: AutomationKey) {
    setSettings((cur) => {
      const next = { ...cur, [key]: !cur[key] };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

  const activeCount = Object.values(settings).filter(Boolean).length;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-5">
      {/* Sol: Otomasyon Ayarları */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white shadow">
            <Settings2 size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              Otomasyon Ayarları
              <span className="text-[10px] font-medium uppercase tracking-wider bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full border border-violet-200">
                {activeCount}/{Object.keys(settings).length} aktif
              </span>
            </h3>
            <div className="text-[11px] text-slate-500 leading-tight">
              Çırak'ın insan müdahalesi olmadan yaptığı işler
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {(Object.keys(settings) as AutomationKey[]).map((key) => {
            const on = settings[key];
            const meta = AUTOMATION_META[key];
            const Icon = key === "morning_briefing" ? Sparkles : key === "delayed_notify" ? Truck : Boxes;
            return (
              <div
                key={key}
                className={`rounded-lg border p-3 transition-colors ${
                  on ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        on ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-slate-800 flex items-center gap-1.5">
                        {meta.title}
                        <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-mono inline-flex items-center gap-1">
                          <Clock size={9} />
                          {meta.time}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 leading-snug mt-0.5">{meta.desc}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={on}
                    className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${
                      on ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    aria-label={`${meta.title} ${on ? "kapat" : "aç"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        on ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-[10px] text-slate-500 leading-snug">
          Açık tetikleyiciler her sabah belirtilen saatte çalışır. Demoda görselleştirildi —
          production'da APScheduler ile gerçek cron'a bağlanır.
        </div>
      </div>

      {/* Sağ: Aktivite Akışı */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                Çırak'ın Aktivitesi
                <span
                  className="inline-flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-wider bg-emerald-100 border border-emerald-300 text-emerald-800 px-1.5 py-0.5 rounded-full"
                  title="Backend her 90 saniyede arka planda kontrol çalıştırır; ekran her 15 saniyede yenilenir"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
                  Canlı · 90 sn cron
                </span>
              </h3>
              <div className="text-[11px] text-slate-500 leading-tight">
                Son 7 günde otomatik yaptıkları{generatedAt && ` · ${generatedAt}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={triggerNow}
              disabled={triggering}
              title="Production'da scheduler her 90 saniyede otomatik çalışır; bu buton demo videoda anlık göstermek için var."
              className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm"
            >
              <Play size={11} />
              {triggering ? "Çalışıyor..." : "Şimdi tetikle"}
            </button>
            <button
              onClick={loadActivity}
              className="text-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Yenile
            </button>
          </div>
        </div>

        {loading && events.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-sm text-slate-500 py-8 text-center">Henüz otomatik aksiyon kaydı yok.</div>
        ) : (
          <div className="relative space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {events.map((e, i) => {
              const Icon = ICON_MAP[e.icon] || Bell;
              const time = new Date(e.at).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={i}
                  className="flex gap-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg p-2.5 transition-colors"
                >
                  <div className="shrink-0 w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 leading-tight flex items-center gap-1.5 flex-wrap">
                      {e.title}
                      <span
                        className={`text-[9.5px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded-full border ${CHANNEL_STYLE[e.channel]}`}
                      >
                        {CHANNEL_LABEL[e.channel]}
                      </span>
                      {e.kind === "real" && (
                        <span className="text-[9.5px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Gerçek log
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">{e.detail}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">{time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
