"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendChat, type ChatTurn, type ToolUse } from "@/lib/api";

type Msg = {
  role: "user" | "assistant";
  content: string;
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

const QUICK = [
  "Bu hafta en çok satan 5 ürün?",
  "Stoğu kritik olan ürünler",
  "Gecikmiş kargoları göster",
  "Bugün ne durumdayız?",
];

export default function OwnerChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Merhaba 👋 Ben **Çırak**. Operasyonunuz hakkında sorabilir, brifing isteyebilir, tedarikçi mail taslağı oluşturmamı söyleyebilirsiniz.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);

    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const res = await sendChat("owner", text, history);
    setMessages((m) => [...m, { role: "assistant", content: res.reply, tools: res.tools_used }]);
    setBusy(false);
  }

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm">
      <header className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 bg-slate-50 rounded-t-xl">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-sm">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="text-slate-800 font-semibold leading-tight text-sm">
            Çırak · İşletmeci Asistanı
          </div>
          <div className="text-slate-500 text-[11px]">
            Gemini 2.5 · 5 ajan tool · function-calling
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                m.role === "user"
                  ? "bg-emerald-600 text-white rounded-tr-sm"
                  : "bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-200"
              }`}
            >
              {m.tools && m.tools.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {m.tools.map((t, k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-medium px-1.5 py-0.5"
                      title={JSON.stringify(t.args)}
                    >
                      <Wrench size={9} />
                      {TOOL_LABELS[t.name] || t.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="prose-chat whitespace-pre-wrap break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span>Düşünüyor + araç kullanıyor...</span>
          </div>
        )}
      </div>

      {messages.length <= 1 && !busy && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-200 flex items-center gap-2 bg-slate-50 rounded-b-xl"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="AI'a sor: 'bu hafta en çok satan?'"
          className="flex-1 bg-white text-slate-800 placeholder-slate-400 text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-400/40 border border-slate-300 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-2 rounded-lg transition-colors shadow"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
