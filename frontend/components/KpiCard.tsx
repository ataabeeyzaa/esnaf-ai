import type { LucideIcon } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";
import Sparkline from "./Sparkline";

type Accent = "brand" | "emerald" | "amber" | "rose" | "sky";

type Props = {
  icon: LucideIcon;
  label: string;
  value: number;
  delta?: string;
  accent?: Accent;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: number[];
};

const ACCENT: Record<Accent, string> = {
  brand: "from-brand-50 to-white border-brand-200 text-brand-700",
  emerald: "from-emerald-50 to-white border-emerald-200 text-emerald-700",
  amber: "from-amber-50 to-white border-amber-200 text-amber-700",
  rose: "from-rose-50 to-white border-rose-200 text-rose-700",
  sky: "from-sky-50 to-white border-sky-200 text-sky-700",
};

const ICON_BG: Record<Accent, string> = {
  brand: "bg-brand-100 text-brand-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  sky: "bg-sky-100 text-sky-700",
};

const SPARK_COLOR: Record<Accent, string> = {
  brand: "#d77316",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
};

export default function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  accent = "brand",
  prefix,
  suffix,
  decimals,
  trend,
}: Props) {
  return (
    <div
      className={`group relative rounded-xl border bg-gradient-to-br p-4 hover:shadow-md transition-all overflow-hidden shadow-sm ${ACCENT[accent]}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider font-medium opacity-90 truncate">
            {label}
          </div>
          <div className="text-2xl font-bold mt-1 text-slate-800 tabular-nums">
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals ?? 0}
            />
          </div>
          {delta && <div className="text-[11px] text-slate-500 mt-1 truncate">{delta}</div>}
        </div>
        <div className={`rounded-lg p-2 ml-2 shrink-0 ${ICON_BG[accent]}`}>
          <Icon size={18} />
        </div>
      </div>

      {trend && trend.length > 1 && (
        <div className="mt-2 -mb-1">
          <Sparkline
            data={trend}
            color={SPARK_COLOR[accent]}
            width={220}
            height={28}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
