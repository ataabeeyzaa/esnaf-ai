"use client";

import Link from "next/link";
import { ArrowLeft, CheckCheck, Info, MessageCircle, Wand2, Wrench } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Logo from "@/components/Logo";

// The QR points at the live customer chat with a demo flag. In a real
// production deployment this would be a wa.me link or a Twilio
// WhatsApp Business number. The chat route ignores unknown query
// params, so the QR is safe to scan.
const QR_TARGET = "https://esnaf-ai-ten.vercel.app/chat?source=whatsapp-demo";

// Keep this short enough to read in a screenshot / demo video frame.
const PREVIEW_MESSAGES: Array<{
  side: "in" | "out";
  text: string;
  time: string;
  tool?: string;
}> = [
  { side: "in", text: "Merhaba 👋 Ben Çırak. Size nasıl yardımcı olabilirim?", time: "09:41" },
  { side: "out", text: "5 kg organik domates almak istiyorum", time: "09:41" },
  {
    side: "in",
    text: "Tabii! Stoğumuzda mevcut. Siparişinizi #248 numarayla oluşturdum, yarın kargolanacak.",
    time: "09:42",
    tool: "Yeni sipariş oluşturuldu",
  },
  { side: "out", text: "Teşekkürler 🙏", time: "09:42" },
];

export default function WhatsAppDemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-stone-50 to-emerald-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-slate-500 hover:text-slate-800 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Ana sayfa"
            >
              <ArrowLeft size={18} />
            </Link>
            <Logo size={28} />
            <div className="text-slate-800 font-semibold text-sm">
              Çırak<span className="text-emerald-600">.</span>
              <span className="text-slate-500 font-normal ml-1">WhatsApp Demo</span>
            </div>
          </div>
          <Link
            href="/chat"
            className="text-xs inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <MessageCircle size={14} />
            Web Chat'i Aç
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full px-3 py-1">
            <Wand2 size={12} />
            WhatsApp entegrasyon mockup'ı
          </span>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">
            Müşteri telefonundan WhatsApp ile sorar — <span className="text-emerald-600">Çırak cevap verir.</span>
          </h1>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Bu demo'da QR'ı tarayan müşteri kendi telefonunda web chat'imize ulaşır. Gerçek bir
            production entegrasyonunda QR yerine Twilio veya WhatsApp Business API üzerinden gelen
            mesaj aynı orchestrator'a gider; alttaki ekran nasıl görüneceğini gösterir.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          {/* Left: QR + steps */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <div className="flex items-start gap-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shrink-0">
                <QRCodeSVG
                  value={QR_TARGET}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#047857"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-700 mb-1.5">
                  3 Adım
                </div>
                <ol className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                      1
                    </span>
                    <span>
                      Müşteri telefonunun kamerasıyla QR'ı tarar veya işletmenin WhatsApp Business
                      numarasına yazar.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                      2
                    </span>
                    <span>
                      Mesaj backend orchestrator'a gelir; aynı tool seti (<code className="bg-slate-100 px-1 rounded text-[12px]">lookup_order</code>,{" "}
                      <code className="bg-slate-100 px-1 rounded text-[12px]">check_stock</code>,{" "}
                      <code className="bg-slate-100 px-1 rounded text-[12px]">place_order</code>) çağrılır.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                      3
                    </span>
                    <span>
                      AI Türkçe cevabı WhatsApp üzerinden gönderir — işletmeci hiç müdahale etmez.
                    </span>
                  </li>
                </ol>
                <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-900 flex gap-2">
                  <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Honest disclosure:</strong> Bu hackathon demo'sunda QR canlı web chat'e
                    yönlendiriyor. Production'da{" "}
                    <a
                      href="https://www.twilio.com/whatsapp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-amber-700"
                    >
                      Twilio WhatsApp API
                    </a>{" "}
                    adapter'ı eklenir (<code className="bg-amber-100 px-1 rounded text-[11px]">/chat/customer</code> endpoint'i aynı protokolde).
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Right: phone-frame preview */}
          <section className="mx-auto">
            <PhoneFrame />
          </section>
        </div>

        <footer className="text-center text-xs text-slate-500 pt-10 pb-4">
          Çırak · YZTA 5.0 Hackathon · WhatsApp entegrasyonu vaatten ürün gösterir
        </footer>
      </div>
    </main>
  );
}

function PhoneFrame() {
  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-2.5 shadow-2xl w-[280px]">
      <div className="bg-[#0b141a] rounded-[2rem] overflow-hidden">
        {/* Status bar */}
        <div className="bg-[#202c33] px-4 pt-3 pb-1 flex items-center justify-between text-white text-[10px]">
          <span>09:42</span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-white" />
            <span className="w-1 h-1 rounded-full bg-white" />
            <span className="w-1 h-1 rounded-full bg-white" />
          </span>
        </div>
        {/* Header */}
        <div className="bg-[#202c33] px-3 py-2.5 flex items-center gap-2.5 border-b border-black/30">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold text-xs">
            Ç
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold leading-tight truncate">Çırak (İşletme)</div>
            <div className="text-emerald-400 text-[10px] leading-tight">çevrimiçi · yanıtlıyor</div>
          </div>
        </div>
        {/* Body */}
        <div
          className="px-2.5 py-3 space-y-1.5 min-h-[340px]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(11,20,26,0.92), rgba(11,20,26,0.92)), repeating-linear-gradient(45deg, #1f2c34 0 6px, #0b141a 6px 12px)",
          }}
        >
          {PREVIEW_MESSAGES.map((m, i) => (
            <div key={i} className={`flex ${m.side === "out" ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  m.side === "out"
                    ? "bg-[#005c4b] text-white text-[11px] rounded-lg px-2.5 py-1.5 max-w-[80%] shadow"
                    : "bg-[#202c33] text-white text-[11px] rounded-lg px-2.5 py-1.5 max-w-[80%] shadow"
                }
              >
                {m.tool && (
                  <div className="mb-1 inline-flex items-center gap-1 bg-emerald-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                    <Wrench size={8} />
                    {m.tool}
                  </div>
                )}
                <div className="leading-snug">{m.text}</div>
                <div className="text-right text-[9px] mt-0.5 text-white/60 flex items-center justify-end gap-0.5">
                  {m.time}
                  {m.side === "out" && <CheckCheck size={10} className="text-sky-300" />}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Footer (decorative) */}
        <div className="bg-[#202c33] px-2.5 py-2 flex items-center gap-2 border-t border-black/30">
          <div className="flex-1 bg-[#2a3942] rounded-full text-white/40 text-[10px] px-3 py-1.5">
            Bir mesaj yazın...
          </div>
          <div className="bg-emerald-600 rounded-full p-1.5 text-white">
            <MessageCircle size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
