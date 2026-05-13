"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  Bot,
  Inbox,
  Mail,
  RefreshCw,
  Reply,
  Sparkles,
  Star,
} from "lucide-react";
import Logo from "@/components/Logo";
import { getSupplierInbox, type SupplierEmailItem } from "@/lib/api";

// Tedarikçi portalı — Çırak'ın gönderdiği taslakların alıcı cephesinden
// görünümü. Demo videoda "kritik stok düştü → otomatik mail → tedarikçi
// burada gördü" akışının ekran kanıtıdır.

export default function SupplierPortalPage() {
  const [items, setItems] = useState<SupplierEmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await getSupplierInbox();
      setItems(r.items);
      setGeneratedAt(r.generated_at);
      if (r.items.length > 0 && selectedId === null) {
        setSelectedId(r.items[0].id);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  const suppliers = useMemo(() => {
    const seen = new Map<string, { name: string; count: number }>();
    for (const it of items) {
      const key = it.supplier_email;
      if (!seen.has(key)) seen.set(key, { name: it.supplier_name, count: 0 });
      seen.get(key)!.count += 1;
    }
    return Array.from(seen, ([email, v]) => ({ email, ...v }));
  }, [items]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-stone-50 to-emerald-50 text-slate-800">
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
              Tedarikçi Portalı
              <span className="text-slate-500 font-normal ml-2 text-xs">
                Çırak'ın AI ile gönderdiği siparişler buraya düşer
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

      <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[260px_360px_1fr] gap-4">
        {/* Sidebar — tedarikçiler */}
        <aside className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="text-[10px] uppercase tracking-wider font-medium text-slate-500">Tedarikçiler</div>
            <div className="text-sm text-slate-700 font-medium">
              {suppliers.length} tedarikçi · {items.length} mail
            </div>
          </div>
          <ul>
            <li className="px-4 py-2.5 bg-emerald-50 border-b border-slate-100 flex items-center gap-2 text-sm font-medium text-emerald-800">
              <Inbox size={14} />
              Tüm Gelen Kutusu
              <span className="ml-auto text-xs bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full">
                {items.length}
              </span>
            </li>
            {suppliers.map((s) => (
              <li
                key={s.email}
                className="px-4 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-default"
              >
                <div className="text-[13px] text-slate-800 font-medium truncate">{s.name}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {s.email} · {s.count} mail
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 text-[10px] text-slate-500 border-t border-slate-200 leading-snug">
            Liste her 15 saniyede otomatik güncellenir. Çırak yeni mail attığında burada belirir.
          </div>
        </aside>

        {/* Mail listesi */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2 text-xs text-slate-600">
            <Mail size={13} />
            <span className="font-medium text-slate-800">Gelen mailler</span>
            {generatedAt && <span className="text-slate-400 ml-auto">{generatedAt}</span>}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {loading && items.length === 0 ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-sm bg-rose-50 border-b border-rose-200 text-rose-700">
                Mail listesi yüklenemedi. Backend uyanıyor olabilir, birkaç saniye sonra tekrar deneyin.
              </div>
            ) : items.length === 0 ? (
              <EmptyInbox />
            ) : (
              <ul>
                {items.map((it) => {
                  const isActive = it.id === selectedId;
                  return (
                    <li
                      key={it.id}
                      className={`border-b border-slate-100 cursor-pointer transition-colors ${
                        isActive ? "bg-emerald-50/70" : "hover:bg-slate-50"
                      }`}
                      onClick={() => setSelectedId(it.id)}
                    >
                      <div className="px-4 py-3 flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                          ÇK
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-slate-900 text-[13px] truncate">
                              Çırak Kooperatifi
                            </span>
                            {it.auto && (
                              <span className="text-[9px] font-medium uppercase tracking-wider bg-violet-100 text-violet-700 border border-violet-200 px-1 py-0.5 rounded">
                                <Bot size={9} className="inline" /> AI otomatik
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-800 truncate">{it.subject}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {it.product_name} · öneri {it.suggested_qty} {it.unit}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 shrink-0">{it.sent_at}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Seçili mail detayı */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {selected ? (
            <>
              <div className="px-5 py-4 border-b border-slate-200">
                <div className="text-xl font-semibold text-slate-900 leading-tight mb-3">
                  {selected.subject}
                  {selected.auto && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full align-middle">
                      <Sparkles size={10} />
                      AI otomatik
                    </span>
                  )}
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
                        {selected.sent_at}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Kime: <span className="font-medium text-slate-800">{selected.supplier_name}</span>{" "}
                      <span className="font-mono text-slate-500">
                        &lt;{selected.supplier_email}&gt;
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Ürün: <span className="font-medium text-slate-700">{selected.product_name}</span>{" "}
                      · Önerilen miktar:{" "}
                      <span className="font-medium text-emerald-700">
                        {selected.suggested_qty} {selected.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5 text-[13.5px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </div>
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
                  Tedarikçi yanıt yazarsa Çırak otomatik olarak işler.
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500 p-10 text-center">
              {loading
                ? "Mailler yükleniyor..."
                : "Bir mail seçin veya henüz gönderilen mail yok."}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyInbox() {
  return (
    <div className="p-8 text-center text-sm text-slate-500">
      <Inbox className="mx-auto text-slate-300 mb-2" size={32} />
      Henüz mail yok.
      <div className="text-xs text-slate-400 mt-1">
        İşletmeci dashboard'da "Tedarikçiye Gönder" tıklarsa veya kritik stok düşerse
        otomatik mail buraya düşer.
      </div>
    </div>
  );
}
