"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Mail,
  Package,
  RefreshCw,
  Sparkles,
  Store,
  Truck,
  TrendingUp,
  Wallet,
  Clock,
} from "lucide-react";
import AutomationPanel from "@/components/AutomationPanel";
import BulkActionModal from "@/components/BulkActionModal";
import ForecastCard from "@/components/ForecastCard";
import InsightsBar from "@/components/InsightsBar";
import KpiCard from "@/components/KpiCard";
import Logo from "@/components/Logo";
import OwnerChat from "@/components/OwnerChat";
import OrderDetailModal from "@/components/OrderDetailModal";
import SupplierEmailModal from "@/components/SupplierEmailModal";
import { useToast } from "@/components/Toast";
import {
  advanceOrderStatus,
  getDashboard,
  markShipmentDelivered,
  refreshBriefing,
  type DashboardSummary,
  type OrderOut,
} from "@/lib/api";


const NEXT_STATUS_LABEL: Record<string, { label: string; icon: typeof ArrowRight }> = {
  "Onay bekliyor": { label: "Hazırlamaya Başla", icon: Package },
  "Hazırlanıyor": { label: "Kargoya Ver", icon: Truck },
  "Kargoya verildi": { label: "Teslim Edildi", icon: CheckCircle2 },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [emailModalProduct, setEmailModalProduct] = useState<{ id: number; name: string } | null>(null);
  const [orderModalOrder, setOrderModalOrder] = useState<OrderOut | null>(null);
  const [bulkNotifyOpen, setBulkNotifyOpen] = useState(false);
  const [bulkSupplierOpen, setBulkSupplierOpen] = useState(false);
  const toast = useToast();

  async function load(silent = false) {
    setLoading(true);
    setError(null);
    try {
      const d = await getDashboard();
      setData(d);
      if (!silent) toast.success("Dashboard yenilendi", `Veriler ${new Date().toLocaleTimeString("tr-TR")} itibarıyla güncel`);
    } catch (e) {
      setError(String(e));
      toast.error("Sunucuya bağlanılamadı", "Backend ayakta mı?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // intentionally exclude `toast` and `load` from deps to avoid re-fetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdvanceOrder(orderId: number, currentStatus: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const r = await advanceOrderStatus(orderId);
      toast.success(`Sipariş #${orderId} ilerletildi`, `${currentStatus} → ${r.new_status_tr}`);
      await load(true);
    } catch (err) {
      toast.error("Sipariş ilerletilemedi", err instanceof Error ? err.message : "");
    }
  }

  async function handleShipmentDelivered(shipmentId: number, orderId: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await markShipmentDelivered(shipmentId);
      toast.success(
        `Kargo webhook'u alındı`,
        `#${orderId} numaralı sipariş "teslim edildi" olarak güncellendi`
      );
      await load(true);
    } catch (err) {
      toast.error("Webhook simülasyonu başarısız", err instanceof Error ? err.message : "");
    }
  }

  async function handleRefreshBriefing() {
    if (!data) return;
    setBriefingLoading(true);
    try {
      const r = await refreshBriefing();
      setData({ ...data, briefing: r.briefing });
      toast.success("Brifing yenilendi", "AI sabah özetini güncelledi");
    } catch {
      toast.error("Brifing yenilenemedi", "Lütfen tekrar deneyin");
    } finally {
      setBriefingLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-stone-50 to-emerald-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={40} className="shrink-0" />
            <div>
              <div className="font-semibold text-base leading-tight text-slate-900">
                Çırak<span className="text-emerald-600">.</span>{" "}
                <span className="text-slate-500 font-normal">İşletmeci Paneli</span>
              </div>
              <div className="text-xs text-slate-500">
                Tarım Kooperatifi · {data ? new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }) : "—"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => load()}
              disabled={loading}
              className="text-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md flex items-center gap-2 disabled:opacity-40 shadow-sm"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Yenile
            </button>
            <Link
              href="/chat"
              className="text-xs flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md shadow-sm"
            >
              <ArrowLeft size={13} />
              Müşteri Chat
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
            Sunucuya bağlanılamadı: {error}
            <div className="text-xs text-rose-600 mt-1">
              Backend ayakta mı? <code className="bg-rose-100 px-1 rounded">cd backend && uvicorn app.main:app</code>
            </div>
          </div>
        )}

        {loading && !data && <KpiSkeleton />}

        {data && (
          <>
            {/* AI Insights bar — proactive action suggestions */}
            <InsightsBar
              onAction={(action) => {
                if (action === "bulk_supplier") setBulkSupplierOpen(true);
                if (action === "bulk_notify") setBulkNotifyOpen(true);
              }}
            />

            {/* KPI cards */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard
                icon={Package}
                label="Bugünkü Sipariş"
                value={data.orders_today}
                delta={`Son 7 gün toplam: ${data.trend_orders_7d.reduce((a, b) => a + b, 0)}`}
                accent="brand"
                trend={data.trend_orders_7d}
              />
              <KpiCard
                icon={Wallet}
                label="Bugünkü Gelir"
                value={data.revenue_today}
                suffix=" ₺"
                delta={`Son 7 gün: ${data.trend_revenue_7d.reduce((a, b) => a + b, 0).toLocaleString("tr-TR")} ₺`}
                accent="emerald"
                trend={data.trend_revenue_7d}
              />
              <KpiCard
                icon={Truck}
                label="Kargolar (yolda)"
                value={data.pending_shipments}
                delta={`Toplam sipariş: ${data.total_orders}`}
                accent="sky"
              />
              <KpiCard
                icon={Clock}
                label="Gecikmiş Kargo"
                value={data.delayed_shipments}
                delta={data.delayed_shipments > 0 ? "Proaktif bildirim önerilir" : "Hepsi zamanında"}
                accent="rose"
              />
              <KpiCard
                icon={Boxes}
                label="Kritik Stok"
                value={data.low_stock_products}
                delta="Tedarikçi siparişi öner"
                accent="amber"
              />
            </section>

            {/* Briefing + Chat row */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* AI Briefing */}
              <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-5 relative overflow-hidden shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800 font-semibold text-sm">Sabah Brifingi</span>
                        <span
                          title="Production'da her sabah 08:00'de otomatik üretilir; demo'da manuel tetiklenebilir"
                          className="inline-flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full px-1.5 py-0.5 leading-none"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
                          Otomatik · 08:00
                        </span>
                      </div>
                      <div className="text-emerald-700 text-[11px]">
                        AI tarafından dinamik üretildi · Gemini function-calling
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleRefreshBriefing}
                    disabled={briefingLoading}
                    className="text-xs bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-md flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <RefreshCw size={11} className={briefingLoading ? "animate-spin" : ""} />
                    Yenile
                  </button>
                </div>
                <div className="prose-chat text-slate-700 text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.briefing}</ReactMarkdown>
                </div>
              </div>

              {/* Owner Chat */}
              <div className="h-[420px]">
                <OwnerChat />
              </div>
            </section>

            {/* Otomasyon paneli — Çırak'ın otomatik yaptığı işlerin kanıtı */}
            <AutomationPanel />

            {/* Alerts row */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* Stock alerts */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" size={18} />
                    <h3 className="font-semibold text-slate-800">Kritik Stok Uyarıları</h3>
                    <span className="text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-2 py-0.5 leading-none">
                      {data.stock_alerts.length}
                    </span>
                  </div>
                  {data.stock_alerts.length > 0 && (
                    <button
                      onClick={() => setBulkSupplierOpen(true)}
                      className="text-[11px] inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-md shadow-sm transition-colors"
                      title="Tüm kritik stoklar için tek seferde tedarikçi maili"
                    >
                      <Sparkles size={11} />
                      Toplu Mail
                    </button>
                  )}
                </div>
                {data.stock_alerts.length === 0 ? (
                  <div className="flex-1 text-slate-500 text-sm py-6 text-center flex items-center justify-center">
                    Tüm stoklar güvenli seviyede 👍
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 max-h-[420px] overflow-y-auto pr-1">
                    {data.stock_alerts.map((a) => (
                      <div
                        key={a.id}
                        className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 text-sm truncate">
                            {a.product_name}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Stok: <span className="text-amber-700 font-semibold">{a.stock}</span>
                            <span className="text-slate-500"> / Eşik: {a.low_stock_threshold}</span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setEmailModalProduct({ id: a.product_id, name: a.product_name })
                          }
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                          title="AI ile tedarikçi mail taslağı oluştur"
                        >
                          <Mail size={12} />
                          Tedarikçi maili
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delayed shipments */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Clock className="text-rose-500" size={18} />
                    <h3 className="font-semibold text-slate-800">Gecikmiş Kargolar</h3>
                    <span className="text-[11px] font-medium bg-rose-100 text-rose-700 border border-rose-300 rounded-full px-2 py-0.5 leading-none">
                      {data.delayed_shipment_orders.length}
                    </span>
                  </div>
                  {data.delayed_shipment_orders.length > 0 && (
                    <button
                      onClick={() => setBulkNotifyOpen(true)}
                      className="text-[11px] inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-md shadow-sm transition-colors"
                      title="Tüm gecikenler için AI ile kişiselleştirilmiş bildirim taslağı"
                    >
                      <Sparkles size={11} />
                      Tümünü Bilgilendir
                    </button>
                  )}
                </div>
                {data.delayed_shipment_orders.length === 0 ? (
                  <div className="flex-1 text-slate-500 text-sm py-6 text-center flex items-center justify-center">
                    Tüm kargolar planlanan sürede 🚚
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 max-h-[420px] overflow-y-auto pr-1">
                    {data.delayed_shipment_orders.slice(0, 12).map((o) => (
                      <div
                        key={o.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setOrderModalOrder(o)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setOrderModalOrder(o);
                        }}
                        className="bg-rose-50 hover:bg-white border border-rose-200 hover:border-rose-400 rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 text-sm truncate">
                            #{o.id} · {o.customer_name}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{o.items.length} ürün · {o.total.toLocaleString("tr-TR")} ₺</span>
                            {o.shipment?.eta && (
                              <span className="inline-flex items-center gap-1 text-rose-700">
                                <Clock size={10} />
                                {new Date(o.shipment.eta).toLocaleDateString("tr-TR", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[10px] font-medium bg-rose-100 text-rose-700 border border-rose-300 px-2 py-0.5 rounded whitespace-nowrap">
                            {o.shipment?.carrier}
                          </span>
                          {o.shipment && (
                            <button
                              onClick={(e) => handleShipmentDelivered(o.shipment!.id, o.id, e)}
                              title="Kargo şirketinin webhook'unu simüle et — production'da Yurtiçi/Aras/MNG sistemi POST atar"
                              className="text-[10px] inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded shadow-sm transition-colors"
                            >
                              <CheckCircle2 size={10} />
                              Teslim alındı
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* AI Forecast — 7-day sales prediction */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ForecastCard />
              {/* Top sellers (placeholder spot — original block continues below) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-emerald-400" size={18} />
                  <h3 className="font-semibold text-slate-800">Son 7 Gün En Çok Satanlar</h3>
                </div>
                <div className="space-y-2.5">
                  {data.top_products.length === 0 && (
                    <div className="text-slate-500 text-sm py-4 text-center">Veri yok</div>
                  )}
                  {data.top_products.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                          i === 0
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                            : i === 1
                            ? "bg-slate-100 text-slate-700 border border-slate-300"
                            : i === 2
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.qty} {p.unit} · {p.revenue.toLocaleString("tr-TR")} ₺
                        </div>
                      </div>
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5"
                          style={{
                            width: `${Math.min(
                              100,
                              (p.qty / Math.max(...data.top_products.map((x) => x.qty), 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent orders */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="text-sky-400" size={18} />
                  <h3 className="font-semibold text-slate-800">Son Siparişler</h3>
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {data.recent_orders.map((o) => {
                    const advance = NEXT_STATUS_LABEL[o.status];
                    const AdvanceIcon = advance?.icon;
                    return (
                      <div
                        key={o.id}
                        onClick={() => setOrderModalOrder(o)}
                        className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-lg p-3 text-sm cursor-pointer transition-all hover:shadow-sm"
                      >
                        <div className="flex justify-between items-baseline gap-2">
                          <div className="font-medium text-slate-800 truncate">
                            #{o.id} · {o.customer_name}
                          </div>
                          <div className="text-emerald-700 text-sm font-semibold shrink-0">
                            {o.total.toLocaleString("tr-TR")} ₺
                          </div>
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>{o.items.length} ürün</span>
                          <span className="text-slate-400">·</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700">
                            {o.status}
                          </span>
                          {o.shipment?.delayed && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 border border-rose-300">
                              gecikme
                            </span>
                          )}
                          <span className="ml-auto text-slate-500">
                            {new Date(o.created_at).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                        {advance && AdvanceIcon && (
                          <button
                            onClick={(e) => handleAdvanceOrder(o.id, o.status, e)}
                            className="mt-2 inline-flex items-center gap-1.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md shadow-sm transition-colors"
                          >
                            <AdvanceIcon size={11} />
                            {advance.label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <footer className="text-center text-xs text-slate-500 pt-4 pb-8">
              Çırak · YZTA 5.0 Hackathon · FastAPI + Gemini 2.5 + Next.js
              <span className="mx-2">·</span>
              <Link href="/chat" className="text-emerald-700 hover:underline inline-flex items-center gap-1">
                Müşteri arayüzü <ArrowUpRight size={11} />
              </Link>
            </footer>
          </>
        )}
      </div>

      {emailModalProduct && (
        <SupplierEmailModal
          productId={emailModalProduct.id}
          productName={emailModalProduct.name}
          onClose={() => setEmailModalProduct(null)}
        />
      )}

      {orderModalOrder && (
        <OrderDetailModal
          order={orderModalOrder}
          onClose={() => setOrderModalOrder(null)}
        />
      )}

      {bulkNotifyOpen && (
        <BulkActionModal mode="notify" onClose={() => setBulkNotifyOpen(false)} />
      )}

      {bulkSupplierOpen && (
        <BulkActionModal mode="supplier" onClose={() => setBulkSupplierOpen(false)} />
      )}
    </main>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-24 rounded-xl bg-white border border-slate-200 animate-pulse"
        />
      ))}
    </div>
  );
}
