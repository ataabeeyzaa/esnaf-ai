"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, CheckCheck, Wrench } from "lucide-react";
import type { ToolUse } from "@/lib/api";

type Props = {
  role: "user" | "assistant";
  content: string;
  time?: string;
  tools?: ToolUse[];
};

const TOOL_LABELS: Record<string, string> = {
  lookup_order: "Sipariş sorgulandı",
  check_stock: "Stok kontrol edildi",
  track_shipment: "Kargo izlendi",
  draft_supplier_email: "Tedarikçi maili hazırlandı",
  daily_briefing: "Günlük özet üretildi",
  place_order: "Yeni sipariş oluşturuldu",
};

const PROMINENT_TOOLS = new Set(["place_order"]);

export default function MessageBubble({ role, content, time, tools }: Props) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1.5 animate-slide-up`}>
      <div
        className={`max-w-[78%] md:max-w-[65%] rounded-lg px-3 py-2 shadow-bubble text-[14.5px] leading-snug ${
          isUser
            ? "bg-whatsapp-out text-whatsapp-text rounded-tr-sm"
            : "bg-whatsapp-message text-whatsapp-text rounded-tl-sm border border-whatsapp-border"
        }`}
      >
        {tools && tools.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {tools.map((t, i) => {
              const prominent = PROMINENT_TOOLS.has(t.name);
              const args = (t.args ?? {}) as Record<string, unknown>;
              const orderId = t.name === "place_order" ? args.order_id : undefined;
              const label = TOOL_LABELS[t.name] || t.name;
              return (
                <span
                  key={i}
                  className={
                    prominent
                      ? "inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white border border-emerald-700 text-[10.5px] font-semibold px-2 py-0.5 shadow-sm animate-pulse-slow"
                      : "inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10.5px] font-medium px-2 py-0.5"
                  }
                  title={`Tool: ${t.name} args: ${JSON.stringify(t.args)}`}
                >
                  <Wrench size={10} />
                  {prominent ? "✓ " : ""}{label}
                  {typeof orderId === "number" && <span className="ml-0.5">#{orderId}</span>}
                </span>
              );
            })}
          </div>
        )}
        <div className="prose-chat whitespace-pre-wrap break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        {time && (
          <div className="flex justify-end items-center gap-1 mt-1 text-[10.5px] text-whatsapp-muted">
            <span>{time}</span>
            {isUser && <CheckCheck size={12} className="text-sky-500" />}
          </div>
        )}
      </div>
    </div>
  );
}
