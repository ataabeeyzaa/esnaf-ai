"use client";

import { useEffect, useState } from "react";
import { Copy, Mail, MessageSquare, Send, Sparkles, X } from "lucide-react";
import {
  bulkNotifyDelayed,
  bulkSupplierEmails,
  sendBulkNotifyDelayed,
  type BulkNotifyMessage,
  type BulkSupplierDraft,
} from "@/lib/api";
import { useToast } from "./Toast";

type Mode = "notify" | "supplier";

type Props = {
  mode: Mode;
  onClose: () => void;
};

export default function BulkActionModal({ mode, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<BulkNotifyMessage[]>([]);
  const [drafts, setDrafts] = useState<BulkSupplierDraft[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (mode === "notify") {
          const r = await bulkNotifyDelayed();
          if (!cancelled) setMessages(r.messages);
        } else {
          const r = await bulkSupplierEmails();
          if (!cancelled) setDrafts(r.drafts);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  function copyOne(text: string, id: number) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Panoya kopyalandı");
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
  }

  async function sendAllNotifications() {
    if (mode !== "notify" || messages.length === 0) return;
    setSending(true);
    try {
      const r = await sendBulkNotifyDelayed();
      toast.success(
        "Bildirimler gönderildi",
        `${r.sent} müşteriye ${r.channel === "whatsapp" ? "WhatsApp" : r.channel} mesajı iletildi`
      );
      onClose();
    } catch (e) {
      toast.error("Gönderim başarısız", String(e));
    } finally {
      setSending(false);
    }
  }

  function copyAll() {
    if (mode === "notify") {
      const text = messages
        .map((m) => `KIME: ${m.customer_name} (${m.customer_phone})\n${m.message}`)
        .join("\n\n---\n\n");
      navigator.clipboard.writeText(text);
      toast.success("Tüm mesajlar kopyalandı", `${messages.length} mesaj`);
    } else {
      const text = drafts
        .map(
          (d) =>
            `KIME: ${d.supplier_email}\nKONU: ${d.subject}\n\n${d.body}`
        )
        .join("\n\n=====\n\n");
      navigator.clipboard.writeText(text);
      toast.success("Tüm mailler kopyalandı", `${drafts.length} mail`);
    }
  }

  const title =
    mode === "notify"
      ? "Toplu Müşteri Bildirimi"
      : "Toplu Tedarikçi Mailleri";
  const subtitle =
    mode === "notify"
      ? "Gecikmiş kargolu tüm müşterilere AI ile kişiselleştirilmiş WhatsApp/SMS mesajları"
      : "Kritik stoktaki tüm ürünler için AI tarafından hazırlanmış tedarikçi mail taslakları";
  const Icon = mode === "notify" ? MessageSquare : Mail;
  const total = mode === "notify" ? messages.length : drafts.length;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col animate-slide-up"
      >
        <header className="px-6 py-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm shrink-0">
              <Icon size={20} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-base flex items-center gap-2 flex-wrap">
                {title}
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-full">
                  <Sparkles size={10} />
                  AI üretti
                </span>
                {!loading && total > 0 && (
                  <span className="text-[10px] bg-slate-100 border border-slate-300 text-slate-700 px-2 py-0.5 rounded-full">
                    {total} adet
                  </span>
                )}
              </div>
              <div className="text-slate-500 text-xs mt-0.5">{subtitle}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg shrink-0"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && (
            <div className="flex items-center gap-3 text-slate-500 py-12 justify-center">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="ml-3 text-sm">AI mesajlar hazırlanıyor...</span>
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {!loading && mode === "notify" && messages.map((m) => (
            <div key={m.order_id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1.5 flex-wrap">
                <div className="text-xs font-medium text-slate-700">
                  #{m.order_id} · <span className="text-slate-900">{m.customer_name}</span>
                  <span className="ml-2 font-mono text-slate-500">{m.customer_phone}</span>
                </div>
                <button
                  onClick={() => copyOne(`${m.message}`, m.order_id)}
                  className="text-[11px] inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2 py-0.5 rounded-md"
                >
                  <Copy size={10} />
                  {copied === m.order_id ? "Kopyalandı" : "Kopyala"}
                </button>
              </div>
              <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {m.message}
              </div>
            </div>
          ))}

          {!loading && mode === "supplier" && drafts.map((d) => (
            <div key={d.product_id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1.5 flex-wrap">
                <div className="text-xs font-medium text-slate-700">
                  📦 <span className="text-slate-900">{d.product_name}</span>
                  <span className="ml-2 text-slate-500">stok: {d.current_stock} {d.unit}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="text-emerald-700 font-semibold">öneri: {d.suggested_qty} {d.unit}</span>
                </div>
                <button
                  onClick={() => copyOne(`Kime: ${d.supplier_email}\nKonu: ${d.subject}\n\n${d.body}`, d.product_id)}
                  className="text-[11px] inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2 py-0.5 rounded-md"
                >
                  <Copy size={10} />
                  {copied === d.product_id ? "Kopyalandı" : "Kopyala"}
                </button>
              </div>
              <div className="text-[11px] text-slate-500 mb-1">
                <span className="font-mono">{d.supplier_email}</span> · {d.subject}
              </div>
              <div className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed bg-white border border-slate-200 rounded-lg p-2.5 max-h-40 overflow-y-auto">
                {d.body}
              </div>
            </div>
          ))}

          {!loading && total === 0 && (
            <div className="text-slate-500 text-sm py-8 text-center">
              Şu an üretilecek mesaj yok 🎉
            </div>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Demo: gerçek entegrasyon için Twilio/WA Business API · SMTP eklenir.
          </div>
          <div className="flex items-center gap-2">
            {!loading && total > 0 && (
              <>
                <button
                  onClick={copyAll}
                  className="text-sm bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Copy size={13} />
                  Kopyala
                </button>
                {mode === "notify" && (
                  <button
                    onClick={sendAllNotifications}
                    disabled={sending}
                    className="text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-sm"
                  >
                    <Send size={13} />
                    {sending ? "Gönderiliyor..." : `Hepsini Gönder (${total})`}
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="text-sm bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-4 py-1.5 rounded-lg shadow-sm"
            >
              Kapat
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
