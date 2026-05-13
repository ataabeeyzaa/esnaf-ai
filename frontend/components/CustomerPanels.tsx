"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  getCampaigns,
  getCustomerHelp,
  getCustomerNotifications,
  type Campaign,
  type CustomerNotification,
  type HelpContact,
  type HelpFAQ,
} from "@/lib/api";

// Three side panels that replace the chat view when the user clicks the
// non-Çırak rows in the WhatsApp-style sidebar. Each panel pulls live
// data from a /customer/* endpoint instead of showing a placeholder
// toast.

export function NotificationsPanel({ phone }: { phone: string }) {
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCustomerNotifications(phone)
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setCustomerName(r.customer?.name ?? null);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  return (
    <PanelLayout
      icon={Bell}
      title="Sipariş Bildirimi"
      subtitle={customerName ? `${customerName} adına son güncellemeler` : "Siparişlerinizin durumu"}
    >
      {loading && <SkeletonRows />}
      {error && <ErrorBox text="Bildirimler yüklenemedi. Sunucu uyuyor olabilir, birkaç saniye sonra tekrar deneyin." />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title="Henüz siparişiniz yok"
          desc="Çırak'a bir mesaj göndererek hemen sipariş verebilirsiniz."
        />
      )}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-2.5">
          {items.map((it) => (
            <div
              key={it.order_id}
              className={`rounded-xl border p-3.5 ${
                it.delayed
                  ? "bg-rose-50 border-rose-200"
                  : it.status_raw === "delivered"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 text-sm leading-tight">{it.summary}</div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Package size={11} />
                      {it.item_count} ürün · {it.total.toLocaleString("tr-TR")} ₺
                    </span>
                    {it.first_item && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="truncate">{it.first_item}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{new Date(it.created_at).toLocaleDateString("tr-TR")}</span>
                    {it.shipment_eta && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} />
                          Tahmini teslim:{" "}
                          {new Date(it.shipment_eta).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${
                    it.delayed
                      ? "bg-rose-100 text-rose-800 border-rose-300"
                      : it.status_raw === "delivered"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : it.status_raw === "shipped"
                      ? "bg-violet-100 text-violet-800 border-violet-300"
                      : it.status_raw === "preparing"
                      ? "bg-sky-100 text-sky-800 border-sky-300"
                      : "bg-amber-100 text-amber-800 border-amber-300"
                  }`}
                >
                  {it.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelLayout>
  );
}

export function CampaignsPanel({ onOrderPrompt }: { onOrderPrompt: (prompt: string) => void }) {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCampaigns()
      .then((r) => {
        setItems(r.items);
        setError(null);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PanelLayout icon={Tag} title="Kampanyalar" subtitle="Aktif fırsatlar — tek tıkla sipariş">
      {loading && <SkeletonRows />}
      {error && <ErrorBox text="Kampanyalar yüklenemedi." />}
      {!loading && !error && (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((c) => (
            <div
              key={c.id}
              className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-3xl leading-none" aria-hidden>
                  {c.emoji}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full px-2 py-0.5">
                  {c.tag}
                </span>
              </div>
              <h4 className="font-semibold text-slate-900 mt-1">{c.title}</h4>
              <p className="text-sm text-slate-700 mt-1 leading-snug">{c.tagline}</p>
              <div className="text-[11px] text-slate-500 mt-2 inline-flex items-center gap-1">
                <Clock size={11} />
                Geçerlilik: {c.valid_until}
              </div>
              <button
                onClick={() => onOrderPrompt(c.cta_prompt)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors"
              >
                <Sparkles size={13} />
                Çırak'a Sipariş Ver
              </button>
            </div>
          ))}
        </div>
      )}
    </PanelLayout>
  );
}

export function HelpPanel({ onAskCirak }: { onAskCirak: () => void }) {
  const [faq, setFaq] = useState<HelpFAQ[]>([]);
  const [contact, setContact] = useState<HelpContact | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCustomerHelp()
      .then((r) => {
        setFaq(r.faq);
        setContact(r.contact);
        setError(null);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PanelLayout
      icon={MessageCircle}
      title="Müşteri Hizmetleri"
      subtitle="Sıkça sorulanlar — cevap bulamazsanız Çırak'a yazın"
    >
      {loading && <SkeletonRows />}
      {error && <ErrorBox text="İçerik yüklenemedi." />}
      {!loading && !error && (
        <>
          <div className="space-y-2">
            {faq.map((f, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="w-full text-left px-3.5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between gap-2"
                >
                  <span>{f.q}</span>
                  <span className="text-slate-400 text-xs shrink-0">{openIdx === i ? "−" : "+"}</span>
                </button>
                {openIdx === i && (
                  <div className="px-3.5 pb-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {contact && (
            <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                İletişim
              </div>
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Clock size={13} className="text-slate-500" />
                  {contact.hours}
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={13} className="text-slate-500" />
                  {contact.phone}
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={13} className="text-slate-500" />
                  {contact.email}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={13} className="text-slate-500" />
                  {contact.address}
                </li>
              </ul>
            </div>
          )}

          <button
            onClick={onAskCirak}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <MessageCircle size={16} />
            Çırak'a Sor
          </button>
        </>
      )}
    </PanelLayout>
  );
}

// --- Small shared building blocks ---

function PanelLayout({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Bell;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 text-lg leading-tight">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">{text}</div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Bell;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center py-10 text-slate-500">
      <Icon className="mx-auto mb-3 text-slate-300" size={36} />
      <div className="font-medium text-slate-700">{title}</div>
      <div className="text-sm mt-1">{desc}</div>
    </div>
  );
}
