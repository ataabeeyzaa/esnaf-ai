"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, Copy, Inbox, Mail, Pencil, Reply, Send, Sparkles, Star, X } from "lucide-react";
import { draftSupplierEmail, sendSupplierEmail } from "@/lib/api";
import { useToast } from "./Toast";

type Props = {
  productId: number;
  productName: string;
  onClose: () => void;
};

type Tab = "draft" | "inbox";

export default function SupplierEmailModal({ productId, productName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof draftSupplierEmail>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<Tab>("draft");
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    draftSupplierEmail(productId)
      .then((d) => {
        if (mounted) setData(d);
      })
      .catch((e: Error) => {
        if (mounted) setError(e.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [productId]);

  function copyMail() {
    if (!data) return;
    const full = `Kime: ${data.supplier_email}\nKonu: ${data.subject}\n\n${data.body}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    toast.success("Mail panoya kopyalandı", `${data.supplier_name}'a göndermeye hazır`);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendMail() {
    if (!data) return;
    setSending(true);
    try {
      const r = await sendSupplierEmail(productId);
      toast.success(
        "Mail tedarikçiye gönderildi",
        `${r.supplier_email} adresine ulaştı — Tedarikçi Portalı'nda görebilirsin`
      );
      onClose();
    } catch (err) {
      toast.error("Gönderim başarısız", err instanceof Error ? err.message : "");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Mail size={20} />
            </div>
            <div>
              <div className="text-slate-800 font-semibold text-base flex items-center gap-2">
                Tedarikçi Mail Taslağı
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-full">
                  <Sparkles size={10} />
                  AI üretti
                </span>
              </div>
              <div className="text-slate-500 text-xs">{productName}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X size={20} />
          </button>
        </header>

        {data && !loading && !error && (
          <div className="px-5 pt-2 flex items-center gap-1 border-b border-slate-200 bg-white">
            <TabButton active={tab === "draft"} onClick={() => setTab("draft")} icon={Pencil}>
              Taslak
            </TabButton>
            <TabButton active={tab === "inbox"} onClick={() => setTab("inbox")} icon={Inbox}>
              Tedarikçinin Gelen Kutusu
            </TabButton>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center gap-3 text-slate-500 py-12 justify-center">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="ml-3 text-sm">Satış geçmişi analiz ediliyor, taslak hazırlanıyor...</span>
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
          {data && !loading && !error && tab === "draft" && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <Field label="Tedarikçi" value={data.supplier_name} />
                <Field label="E-posta" value={data.supplier_email} mono />
                <Field
                  label="Mevcut stok"
                  value={`${data.current_stock} ${data.unit}`}
                  warn={data.current_stock < 30}
                />
                <Field
                  label="Önerilen sipariş"
                  value={`${data.suggested_qty} ${data.unit}`}
                  highlight
                />
                <Field label="Son 14 gün satış" value={`${data.last_14_days_sales} ${data.unit}`} />
                <Field label="Ürün ID" value={`#${productId}`} mono />
              </div>

              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wide mb-1.5">Konu</div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium">
                  {data.subject}
                </div>
              </div>

              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wide mb-1.5">Mail Gövdesi</div>
                <pre className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                  {data.body}
                </pre>
              </div>
            </div>
          )}
          {data && !loading && !error && tab === "inbox" && (
            <SupplierInboxPreview data={data} />
          )}
        </div>

        <footer className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-xs text-slate-500">
            Demo: gerçek SMTP entegrasyonu için sistem üzerinde aktive edilir.
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={!data || loading}
              onClick={copyMail}
              className="bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-40 text-slate-700 text-sm px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Copy size={14} />
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
            <button
              disabled={!data || loading || sending}
              onClick={sendMail}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow"
            >
              <Send size={15} />
              {sending ? "Gönderiliyor..." : "Tedarikçiye Gönder"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Pencil;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 border-b-2 border-emerald-600 -mb-px"
          : "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent -mb-px"
      }
    >
      <Icon size={14} />
      {children}
    </button>
  );
}

function SupplierInboxPreview({
  data,
}: {
  data: Awaited<ReturnType<typeof draftSupplierEmail>>;
}) {
  const initials = data.supplier_name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const nowStr = new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Mail client header strip */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
        <div className="inline-flex items-center gap-1.5">
          <Inbox size={13} />
          <span className="font-medium text-slate-700">Gelen Kutusu</span>
          <span className="text-slate-400">·</span>
          <span>{data.supplier_name}</span>
        </div>
        <span className="text-slate-400 text-[11px]">Önizleme · gerçek SMTP gönderimi production'da</span>
      </div>

      {/* Email header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-200">
        <div className="text-xl font-semibold text-slate-900 leading-tight mb-3">
          {data.subject}
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-semibold text-sm shrink-0">
            ÇK
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-medium text-slate-900 text-sm">
                Çırak Kooperatifi
                <span className="text-slate-500 font-normal ml-1">
                  &lt;siparis@cirak-demo.com&gt;
                </span>
              </div>
              <div className="text-[11px] text-slate-500 inline-flex items-center gap-2">
                <Star size={11} className="text-slate-300" />
                {nowStr}
              </div>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Kime: <span className="font-medium text-slate-800">{initials || "TS"}</span>{" "}
              {data.supplier_name}{" "}
              <span className="font-mono text-slate-500">&lt;{data.supplier_email}&gt;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Email body — natural reader view */}
      <div className="px-5 py-5 text-[13.5px] text-slate-800 leading-relaxed whitespace-pre-wrap">
        {data.body}
      </div>

      {/* Email footer toolbar (decorative) */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2 text-xs">
        <button className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-md">
          <Reply size={11} />
          Yanıtla
        </button>
        <button className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-md">
          <ArrowDownToLine size={11} />
          İndir
        </button>
        <span className="ml-auto text-slate-400 text-[11px]">
          Tedarikçi bu maile yanıt yazdığında Çırak otomatik olarak kaydı günceller.
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
  warn,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-slate-500 text-[11px] uppercase tracking-wide">{label}</div>
      <div
        className={`mt-0.5 ${mono ? "font-mono text-[12.5px]" : "font-medium"} ${
          warn ? "text-amber-700" : highlight ? "text-emerald-700" : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
