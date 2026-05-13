"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Sparkles,
  TrendingUp,
  Truck,
  ArrowRight,
  Bot,
  RefreshCw,
} from "lucide-react";
import { getInsights, type AIInsight } from "@/lib/api";

type Props = {
  onAction?: (action: "bulk_supplier" | "bulk_notify") => void;
};

const ICON_MAP: Record<string, typeof Boxes> = {
  boxes: Boxes,
  truck: Truck,
  trending_up: TrendingUp,
  sparkles: Sparkles,
};

const SEVERITY: Record<AIInsight["severity"], string> = {
  high: "bg-rose-50 border-rose-200 text-rose-900",
  medium: "bg-amber-50 border-amber-200 text-amber-900",
  low: "bg-sky-50 border-sky-200 text-sky-900",
};

const SEVERITY_ICON: Record<AIInsight["severity"], string> = {
  high: "bg-rose-600 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-sky-500 text-white",
};

export default function InsightsBar({ onAction }: Props) {
  const [items, setItems] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const r = await getInsights();
      setItems(r.insights);
      setGeneratedAt(r.generated_at);
    } catch {
      // soft-fail; the bar just doesn't appear
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-700 text-sm">
          <RefreshCw size={14} className="animate-spin" />
          AI içgörüler hazırlanıyor...
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm">
            <Bot size={16} />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm leading-tight">
              Çırak Önerileri
              <span className="ml-2 text-[10px] font-medium uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">
                AI
              </span>
            </div>
            <div className="text-[11px] text-slate-500 leading-none mt-0.5">
              Veriden otomatik aksiyon önerileri · {generatedAt}
            </div>
          </div>
        </div>
        <button
          onClick={load}
          className="text-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw size={11} />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it, i) => {
          const Icon = ICON_MAP[it.icon] || Sparkles;
          return (
            <div
              key={i}
              className={`relative rounded-xl border p-3 transition-all hover:shadow-md ${SEVERITY[it.severity]}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${SEVERITY_ICON[it.severity]}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 text-sm leading-tight">
                    {it.title}
                  </div>
                  <div className="text-[12px] text-slate-700 mt-1 leading-snug">
                    {it.message}
                  </div>
                  {it.action_label && it.action && (
                    <button
                      onClick={() => onAction?.(it.action!)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 hover:border-emerald-400 rounded-md px-2 py-1 shadow-sm transition-colors"
                    >
                      {it.action_label}
                      <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
