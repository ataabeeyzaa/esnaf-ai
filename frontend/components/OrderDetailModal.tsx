"use client";

import { Calendar, MapPin, Package, Truck, User, X, type LucideIcon } from "lucide-react";
import type { OrderOut } from "@/lib/api";

type Props = {
  order: OrderOut;
  onClose: () => void;
};

const STATUS_COLOR: Record<string, string> = {
  "Onay bekliyor": "bg-amber-100 text-amber-800 border-amber-300",
  "Hazırlanıyor": "bg-sky-100 text-sky-800 border-sky-300",
  "Kargoya verildi": "bg-violet-100 text-violet-800 border-violet-300",
  "Teslim edildi": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "İptal edildi": "bg-slate-100 text-slate-700 border-slate-300",
};

const SHIPMENT_STATUS_TR: Record<string, string> = {
  label_created: "Kargo etiketi oluşturuldu",
  picked_up: "Şubeden alındı",
  in_transit: "Yolda",
  out_for_delivery: "Dağıtıma çıktı",
  delivered: "Teslim edildi",
  exception: "Sorun yaşandı",
};

const TIMELINE_ORDER = [
  "label_created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

export default function OrderDetailModal({ order, onClose }: Props) {
  const statusClass = STATUS_COLOR[order.status] || "bg-slate-100 text-slate-700 border-slate-300";
  const currentIdx = order.shipment
    ? TIMELINE_ORDER.indexOf(order.shipment.status)
    : -1;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col animate-slide-up"
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-medium text-slate-500">Sipariş</span>
              <span className="font-mono font-semibold text-slate-800 text-sm">#{order.id}</span>
              <span
                className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusClass}`}
              >
                {order.status}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {order.total.toLocaleString("tr-TR")} ₺
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Customer + meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Tile icon={User} label="Müşteri" value={order.customer_name} />
            <Tile
              icon={Calendar}
              label="Oluşturulma"
              value={new Date(order.created_at).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            <Tile
              icon={Package}
              label="Ürün sayısı"
              value={`${order.items.length} kalem`}
            />
          </div>

          {/* Items */}
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
              Ürünler
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Ürün</th>
                    <th className="text-right px-4 py-2 font-medium">Adet</th>
                    <th className="text-right px-4 py-2 font-medium">Birim</th>
                    <th className="text-right px-4 py-2 font-medium">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.items.map((it, i) => (
                    <tr key={i} className="hover:bg-white transition-colors">
                      <td className="px-4 py-2.5 text-slate-800">{it.product_name}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">
                        {it.qty}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">
                        {it.unit_price.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                        {(it.qty * it.unit_price).toLocaleString("tr-TR")} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Sipariş Toplamı
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-emerald-700 text-base tabular-nums">
                      {order.total.toLocaleString("tr-TR")} ₺
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Shipment timeline */}
          {order.shipment ? (
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
                Kargo
              </div>
              <div className="bg-gradient-to-br from-sky-50 to-white border border-sky-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Truck size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">
                        {order.shipment.carrier}
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        {order.shipment.tracking_no}
                      </div>
                    </div>
                  </div>
                  {order.shipment.delayed && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse-slow" />
                      Gecikme tespit edildi
                    </span>
                  )}
                </div>

                {/* Timeline */}
                <div className="relative pt-2">
                  <div className="absolute top-[18px] left-2 right-2 h-0.5 bg-slate-200" />
                  <div
                    className="absolute top-[18px] left-2 h-0.5 bg-emerald-500 transition-all"
                    style={{
                      width:
                        currentIdx >= 0
                          ? `calc(${(currentIdx / (TIMELINE_ORDER.length - 1)) * 100}% - ${currentIdx === 0 ? 0 : 16}px)`
                          : "0",
                    }}
                  />
                  <div className="grid grid-cols-5 gap-1 relative">
                    {TIMELINE_ORDER.map((status, i) => {
                      const reached = currentIdx >= i;
                      return (
                        <div key={status} className="flex flex-col items-center text-center">
                          <div
                            className={`w-5 h-5 rounded-full border-2 z-10 ${
                              reached
                                ? "bg-emerald-500 border-emerald-600"
                                : "bg-white border-slate-300"
                            }`}
                          />
                          <div
                            className={`text-[10px] mt-1.5 font-medium leading-tight ${
                              reached ? "text-emerald-700" : "text-slate-400"
                            }`}
                          >
                            {SHIPMENT_STATUS_TR[status]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {order.shipment.eta && (
                  <div className="mt-4 text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                    <Calendar size={13} className="text-slate-500" />
                    <span>
                      Tahmini teslim:{" "}
                      <strong className="text-slate-800">
                        {new Date(order.shipment.eta).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </span>
                    {order.shipment.last_update && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">
                          Son güncelleme:{" "}
                          {new Date(order.shipment.last_update).toLocaleString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500 flex items-center gap-2">
              <Truck size={16} />
              Bu sipariş için henüz kargo kaydı oluşturulmamış.
            </div>
          )}
        </div>

        <footer className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            <MapPin size={12} />
            Sipariş detayı veritabanından çekildi
          </div>
          <button
            onClick={onClose}
            className="text-sm bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-4 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            Kapat
          </button>
        </footer>
      </div>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium text-slate-500">
        <Icon size={11} />
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800 mt-0.5 truncate">{value}</div>
    </div>
  );
}
