"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, TrendingDown } from "lucide-react";
import { getForecast, type ForecastItem } from "@/lib/api";

const RISK_STYLE: Record<ForecastItem["risk"], string> = {
  high: "bg-rose-50 border-rose-200",
  medium: "bg-amber-50 border-amber-200",
  low: "bg-emerald-50 border-emerald-200",
};

const RISK_PILL: Record<ForecastItem["risk"], string> = {
  high: "bg-rose-600 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-emerald-600 text-white",
};

const RISK_LABEL: Record<ForecastItem["risk"], string> = {
  high: "Kritik",
  medium: "Risk",
  low: "Güvenli",
};

export default function ForecastCard() {
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await getForecast();
      setItems(r.items);
      setGeneratedAt(r.generated_at);
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="text-violet-500" size={18} />
          <h3 className="font-semibold text-slate-800">
            7 Günlük Stok Tahmini
            <span className="ml-2 text-[10px] font-medium uppercase tracking-wider bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full border border-violet-200">
              AI
            </span>
          </h3>
        </div>
        <button
          onClick={load}
          className="text-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Yenile
        </button>
      </div>

      <div className="text-[11px] text-slate-500 mb-3 leading-relaxed">
        Son 14 günün satış hızı baz alınarak gelecek 7 günde tükenecek ürünler.
        {generatedAt && <span className="ml-1">· {generatedAt}</span>}
      </div>

      {loading && items.length === 0 ? (
        <div className="text-slate-500 text-sm py-6 text-center flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin" />
          Tahmin hesaplanıyor...
        </div>
      ) : items.length === 0 ? (
        <div className="text-slate-500 text-sm py-6 text-center">
          Tahmin için yeterli satış geçmişi yok.
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {items.map((it) => (
            <div
              key={it.product_id}
              className={`border rounded-lg px-3 py-2 ${RISK_STYLE[it.risk]}`}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-medium text-slate-800 text-sm truncate">
                  {it.name}
                </div>
                <span
                  className={`shrink-0 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${RISK_PILL[it.risk]}`}
                >
                  {RISK_LABEL[it.risk]}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
                <span>
                  Stok: <strong className="text-slate-800">{it.current_stock} {it.unit}</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Günlük ort: <strong className="text-slate-800">{it.daily_avg} {it.unit}</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  7g satış: <strong className="text-slate-800">~{it.projected_7d_sales} {it.unit}</strong>
                </span>
              </div>
              <div className="text-[11px] mt-1 flex items-center gap-1">
                {it.risk === "high" && <AlertTriangle size={11} className="text-rose-600" />}
                <span
                  className={
                    it.risk === "high"
                      ? "text-rose-700 font-medium"
                      : it.risk === "medium"
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }
                >
                  Tahmini tükenme: <strong>{it.days_until_empty} gün</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🚀</span>
            <h4 className="font-semibold text-slate-800 text-sm">
              Önümüzdeki 7 Günde Liderler
            </h4>
            <span className="text-[10px] font-medium uppercase tracking-wider bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full border border-violet-200">
              Tahmin
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mb-2.5">
            14 günlük satış hızına göre en çok satması beklenen 5 ürün.
          </div>
          <TopSellersList items={items} />
        </div>
      )}
    </div>
  );
}

function TopSellersList({ items }: { items: ForecastItem[] }) {
  const top = [...items]
    .sort((a, b) => b.projected_7d_sales - a.projected_7d_sales)
    .slice(0, 5);
  const max = top[0]?.projected_7d_sales || 1;
  return (
    <div className="space-y-1.5">
      {top.map((it, i) => {
        const pct = Math.max(8, Math.round((it.projected_7d_sales / max) * 100));
        return (
          <div key={it.product_id} className="text-xs">
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <span className="font-medium text-slate-800 truncate">
                <span className="text-violet-600 mr-1">#{i + 1}</span>
                {it.name}
              </span>
              <span className="shrink-0 text-violet-700 font-semibold tabular-nums">
                ~{it.projected_7d_sales} {it.unit}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-violet-600"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
