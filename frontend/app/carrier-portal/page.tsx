"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import Logo from "@/components/Logo";
import { getCarrierDashboard, markShipmentDelivered, type CarrierItem } from "@/lib/api";
import { useToast } from "@/components/Toast";

// Kargo şirketi portalı — kuryelerin teslim edecekleri kargoları gördüğü
// liste. "Teslim ettim" butonu webhook simülasyonu olarak Çırak
// backend'ine geri bildirim gönderir, kargo gecikmiş listesinden çıkar.

const STATUS_STYLE: Record<string, string> = {
  out_for_delivery: "bg-violet-100 text-violet-800 border-violet-300",
  in_transit: "bg-sky-100 text-sky-800 border-sky-300",
  picked_up: "bg-amber-100 text-amber-800 border-amber-300",
  label_created: "bg-slate-100 text-slate-700 border-slate-300",
  exception: "bg-rose-100 text-rose-800 border-rose-300",
};

export default function CarrierPortalPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getCarrierDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<number | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await getCarrierDashboard();
      setData(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 15000);
    return () => window.clearInterval(id);
  }, []);

  async function handleDeliver(item: CarrierItem) {
    setDelivering(item.shipment_id);
    try {
      await markShipmentDelivered(item.shipment_id);
      toast.success(
        `Sipariş #${item.order_id} teslim olarak işaretlendi`,
        `${item.customer_name} bilgilendirildi (webhook tetiklendi)`
      );
      await load();
    } catch (err) {
      toast.error("İşaretlenemedi", err instanceof Error ? err.message : "");
    } finally {
      setDelivering(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-stone-50 to-sky-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-slate-500 hover:text-slate-800 p-1.5 hover:bg-slate-100 rounded-lg"
              aria-label="Ana sayfa"
            >
              <ArrowLeft size={18} />
            </Link>
            <Logo size={28} />
            <div className="text-slate-800 font-semibold text-sm">
              Kargo Şirketi Paneli
              <span className="text-slate-500 font-normal ml-2 text-xs">
                Kurye görev listesi · webhook tetikleyici
              </span>
            </div>
          </div>
          <button
            onClick={load}
            className="text-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Yenile
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {/* Üst sayaçlar */}
        {data && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Counter
              icon={Package}
              label="Toplam aktif"
              value={data.counts.total_active}
              color="from-slate-500 to-slate-700"
            />
            <Counter
              icon={Truck}
              label="Dağıtımda"
              value={data.counts.delivering}
              color="from-violet-500 to-violet-700"
            />
            <Counter
              icon={Truck}
              label="Yolda"
              value={data.counts.in_transit}
              color="from-sky-500 to-sky-700"
            />
            <Counter
              icon={Package}
              label="Şubeden alındı"
              value={data.counts.picked_up}
              color="from-amber-500 to-amber-700"
            />
            <Counter
              icon={AlertTriangle}
              label="Gecikmiş"
              value={data.counts.delayed}
              color="from-rose-500 to-rose-700"
              warn
            />
          </section>
        )}

        {/* Görev tablosu */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-base">Aktif Kargolar</h2>
            <div className="text-[11px] text-slate-500">
              Liste 15 saniyede bir otomatik yenilenir
            </div>
          </div>
          {loading && !data ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-5 text-sm bg-rose-50 text-rose-800">
              Kargo listesi yüklenemedi. Backend uyanıyor olabilir, birkaç saniye sonra tekrar deneyin.
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Aktif kargo yok. Tüm teslimatlar tamamlanmış 🚚
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.items.map((it) => {
                const isDelivering = delivering === it.shipment_id;
                return (
                  <li
                    key={it.shipment_id}
                    className={`px-5 py-3 flex items-center gap-3 ${
                      it.delayed ? "bg-rose-50/40" : "hover:bg-slate-50"
                    } transition-colors`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <Truck size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">
                          #{it.order_id} · {it.customer_name}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded-full border ${
                            STATUS_STYLE[it.status] || "bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                        >
                          {it.status_label}
                        </span>
                        {it.delayed && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium bg-rose-100 text-rose-700 border border-rose-300 px-1.5 py-0.5 rounded-full">
                            <Clock size={9} />
                            Gecikmiş
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-slate-600 mt-0.5 truncate">
                        {it.products.join(" · ") || "—"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-mono">{it.tracking_no}</span>
                        <span className="text-slate-300">·</span>
                        <span>{it.carrier}</span>
                        <span className="text-slate-300">·</span>
                        <span>{it.customer_city || "—"}</span>
                        {it.eta && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span>
                              ETA:{" "}
                              {new Date(it.eta).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      disabled={isDelivering}
                      onClick={() => handleDeliver(it)}
                      title="Webhook simülasyonu: Çırak backend'ine 'kargo teslim edildi' POST'u atılır"
                      className="shrink-0 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-sm transition-colors"
                    >
                      <CheckCircle2 size={13} />
                      {isDelivering ? "İşleniyor..." : "Teslim ettim"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="text-[11px] text-slate-500 text-center">
          Bu panel demo amaçlıdır — production'da Yurtiçi Kargo / Aras / MNG'nin kendi
          kurye uygulamaları bu sayfa yerine geçer ve webhook'lar otomatik tetiklenir.
        </div>
      </div>
    </main>
  );
}

function Counter({
  icon: Icon,
  label,
  value,
  color,
  warn,
}: {
  icon: typeof Truck;
  label: string;
  value: number;
  color: string;
  warn?: boolean;
}) {
  return (
    <div className={`bg-white border ${warn ? "border-rose-200" : "border-slate-200"} rounded-xl p-3 shadow-sm`}>
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-sm`}>
          <Icon size={14} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 leading-tight">
            {label}
          </div>
          <div className={`text-xl font-bold ${warn ? "text-rose-700" : "text-slate-900"} tabular-nums`}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}
