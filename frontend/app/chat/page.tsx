"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, MoreVertical, Paperclip, Phone, Send, Smile, UserPlus, Video, LayoutDashboard, Zap } from "lucide-react";
import Link from "next/link";
import MessageBubble from "@/components/MessageBubble";
import TypingIndicator from "@/components/TypingIndicator";
import Logo from "@/components/Logo";
import { getCustomerList, sendChat, type ChatTurn, type CustomerListItem, type ToolUse } from "@/lib/api";
import {
  CampaignsPanel,
  HelpPanel,
  NotificationsPanel,
} from "@/components/CustomerPanels";

type ActiveView = "chat" | "notifications" | "help" | "campaigns";

const VIEW_HEADER: Record<ActiveView, { title: string; subtitle: string }> = {
  chat: {
    title: "Çırak",
    subtitle: "Gemini 2.5 · function-calling · 6 ajan tool",
  },
  notifications: {
    title: "Sipariş Bildirimi",
    subtitle: "Siparişlerinizin son durumu",
  },
  help: {
    title: "Müşteri Hizmetleri",
    subtitle: "SSS · iletişim",
  },
  campaigns: {
    title: "Kampanyalar",
    subtitle: "Aktif fırsatlar",
  },
};

type DisplayMessage = {
  role: "user" | "assistant";
  content: string;
  time: string;
  tools?: ToolUse[];
};

const DEMO_QUICK_QUESTIONS = [
  "3 kg organik domates almak istiyorum",
  "5 numaralı siparişim ne durumda?",
  "1 kavanoz köy balı sipariş etmek istiyorum",
  "Köy peyniri stokta var mı?",
  "İade nasıl yapılır?",
];

// Backend henüz uyanmadıysa veya /customer/list 404 dönerse dropdown
// boş kalmasın diye seed.py'deki müşterilerin bir alt kümesini yerel
// fallback olarak tutuyorum. Backend cevap verince /customer/list bunu
// override ediyor.
const FALLBACK_CUSTOMERS: CustomerListItem[] = [
  { id: 6, name: "Beyza ATA", phone: "+90 555 321 8854", city: "Kastamonu", initials: "BA" },
  { id: 1, name: "Ayşe Yılmaz", phone: "+90 532 145 8821", city: "İstanbul", initials: "AY" },
  { id: 2, name: "Mehmet Kaya", phone: "+90 533 287 4412", city: "Ankara", initials: "MK" },
  { id: 5, name: "Ali Çelik", phone: "+90 549 887 2233", city: "Adana", initials: "AÇ" },
  { id: 7, name: "Merve Yıldız", phone: "+90 537 778 1122", city: "Trabzon", initials: "MY" },
];

const DEFAULT_CUSTOMER = FALLBACK_CUSTOMERS[0];

const STORAGE_KEY = "cirak_active_customer";
const FAST_MODE_KEY = "cirak_fast_mode";

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function welcomeMessage(name: string): DisplayMessage {
  const first = name.split(" ")[0];
  return {
    role: "assistant",
    content:
      `Merhaba ${first} 👋 Ben **Çırak**, kooperatifimizin yapay zeka müşteri asistanıyım. ` +
      "Yeni sipariş verebilir, sipariş takibi yapabilir, ürünlerimizi sorabilir ya da kargonuzu izleyebilirsiniz.",
    time: nowTime(),
  };
}

export default function CustomerChatPage() {
  const [activeCustomer, setActiveCustomer] = useState<CustomerListItem>(DEFAULT_CUSTOMER);
  const [customers, setCustomers] = useState<CustomerListItem[]>(FALLBACK_CUSTOMERS);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([welcomeMessage(DEFAULT_CUSTOMER.name)]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("chat");
  const [fastMode, setFastMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore fast mode preference from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(FAST_MODE_KEY);
    if (saved === "true") setFastMode(true);
  }, []);

  function toggleFastMode() {
    setFastMode((cur) => {
      const next = !cur;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(FAST_MODE_KEY, String(next));
      }
      return next;
    });
  }

  // Restore previously active account from localStorage on mount, then
  // try to upgrade the fallback customer list with live data from the
  // backend. If the backend is asleep or the new /customer/list endpoint
  // isn't deployed yet, the fallback list is already usable.
  useEffect(() => {
    let cancelled = false;
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const stored = JSON.parse(raw) as CustomerListItem;
          setActiveCustomer(stored);
          setMessages([welcomeMessage(stored.name)]);
        } catch {
          // ignore malformed cache
        }
      }
    }
    getCustomerList()
      .then((r) => {
        if (cancelled || r.items.length === 0) return;
        setCustomers(r.items);
        // If the current active customer exists in the live list, swap to
        // the live version so we pick up the canonical id from the DB.
        setActiveCustomer((current) => {
          const fresh = r.items.find(
            (c) => c.phone.replace(/\s/g, "") === current.phone.replace(/\s/g, "")
          );
          return fresh ?? current;
        });
      })
      .catch(() => {
        // Backend uyuyor olabilir; FALLBACK_CUSTOMERS yeterli.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function switchAccount(c: CustomerListItem) {
    setActiveCustomer(c);
    setAccountMenuOpen(false);
    setMessages([welcomeMessage(c.name)]);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    }
  }

  function handleSidebarClick(label: string) {
    const map: Record<string, ActiveView> = {
      "Çırak": "chat",
      "Müşteri Hizmetleri": "help",
      "Sipariş Bildirimi": "notifications",
      "Kampanyalar": "campaigns",
    };
    const next = map[label];
    if (next) setActiveView(next);
  }

  function startChatWithPrompt(prompt: string) {
    setActiveView("chat");
    // Allow the chat view to mount, then send.
    setTimeout(() => handleSend(prompt), 0);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    setInput("");

    const userMsg: DisplayMessage = { role: "user", content: text, time: nowTime() };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);

    const history: ChatTurn[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await sendChat("customer", text, history, activeCustomer.phone, fastMode);
    const aiMsg: DisplayMessage = {
      role: "assistant",
      content: res.reply,
      time: nowTime(),
      tools: res.tools_used,
    };
    setMessages((m) => [...m, aiMsg]);
    setBusy(false);
  }

  return (
    <main className="min-h-screen wa-bg flex">
      {/* Left sidebar - mock contacts */}
      <aside className="hidden md:flex md:w-[30%] lg:w-[26%] flex-col bg-whatsapp-panel border-r border-whatsapp-border">
        <div className="relative px-4 py-3 bg-whatsapp-panel2 flex items-center justify-between border-b border-whatsapp-border">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((o) => !o)}
            className="flex items-center gap-3 hover:bg-whatsapp-panel rounded-lg px-1.5 py-1 -mx-1.5 -my-1 transition-colors"
            title="Hesap değiştir"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">
              {activeCustomer.initials}
            </div>
            <div className="text-left min-w-0">
              <div className="text-whatsapp-text text-sm font-medium flex items-center gap-1">
                <span className="truncate">{activeCustomer.name}</span>
                <ChevronDown
                  size={13}
                  className={`text-whatsapp-muted transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}
                />
              </div>
              <div className="text-whatsapp-muted text-xs">{activeCustomer.city}</div>
            </div>
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 rounded-md border border-emerald-300"
            title="İşletmeci Dashboard"
          >
            <LayoutDashboard size={14} />
            Panel
          </Link>
          {accountMenuOpen && (
            <>
              {/* Click-away catcher */}
              <button
                type="button"
                onClick={() => setAccountMenuOpen(false)}
                aria-label="Menüyü kapat"
                className="fixed inset-0 z-30 bg-transparent"
              />
              <div className="absolute top-full left-2 right-2 mt-1 z-40 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-medium text-slate-500 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
                  <UserPlus size={11} />
                  Demo hesapları · birinden diğerine geç
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {customers.map((c) => {
                    const isActive = c.id === activeCustomer.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => switchAccount(c)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-50 transition-colors ${
                          isActive ? "bg-emerald-50" : ""
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {c.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-800 font-medium truncate">{c.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {c.city} · {c.phone}
                          </div>
                        </div>
                        {isActive && <Check size={14} className="text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="px-3 py-2 text-[10px] text-slate-500 bg-slate-50 border-t border-slate-200 leading-snug">
                  Hesap geçişi yerel olarak hatırlanır. Production'da gerçek auth ile değiştirilir.
                </div>
              </div>
            </>
          )}
        </div>
        <div className="px-4 py-2 text-whatsapp-muted text-xs uppercase tracking-wide border-b border-whatsapp-border bg-whatsapp-panel">
          Tarım Kooperatifi
        </div>
        <ContactRow active={activeView === "chat"} name="Çırak" preview="Size nasıl yardımcı olabilirim?" time="şimdi" badge="AI" onClick={() => handleSidebarClick("Çırak")} />
        <ContactRow active={activeView === "help"} name="Müşteri Hizmetleri" preview="Talebiniz oluşturuldu." time="dün" onClick={() => handleSidebarClick("Müşteri Hizmetleri")} />
        <ContactRow active={activeView === "notifications"} name="Sipariş Bildirimi" preview="Kargonuz yola çıktı 📦" time="dün" onClick={() => handleSidebarClick("Sipariş Bildirimi")} />
        <ContactRow active={activeView === "campaigns"} name="Kampanyalar" preview="Bahar fırsatları başladı 🌷" time="2 gün" onClick={() => handleSidebarClick("Kampanyalar")} />
        <div className="mt-auto px-4 py-3 text-[11px] text-whatsapp-muted border-t border-whatsapp-border leading-snug bg-whatsapp-panel">
          Demo: WhatsApp benzeri arayüz · Gerçek mesajlaşma entegrasyonu için Twilio/WA Business API eklenebilir.
        </div>
      </aside>

      {/* Right side - active chat */}
      <section className="flex-1 flex flex-col h-screen">
        <header className="bg-whatsapp-panel2 px-3 md:px-5 py-2.5 flex items-center gap-3 border-b border-whatsapp-border shadow-sm">
          <button className="md:hidden text-whatsapp-text">
            <ArrowLeft size={20} />
          </button>
          <Logo size={40} className="shrink-0" />
          <div className="flex-1">
            <div className="text-whatsapp-text font-medium text-[15px] leading-tight flex items-center gap-2 flex-wrap">
              {VIEW_HEADER[activeView].title}
              {activeView === "chat" && (
                <>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-100 border border-emerald-300 text-emerald-800 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
                    çevrimiçi
                  </span>
                  <button
                    type="button"
                    onClick={toggleFastMode}
                    title={
                      fastMode
                        ? "Hızlı mod açık — Gemini atlanıyor, token harcanmıyor"
                        : "Hızlı moda geç — Gemini çağrılmaz, sadece keyword router cevap verir"
                    }
                    className={
                      fastMode
                        ? "inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500 text-white border border-amber-600 px-1.5 py-0.5 rounded shadow-sm"
                        : "inline-flex items-center gap-1 text-[10px] font-medium bg-white text-slate-600 border border-slate-300 hover:border-amber-400 hover:text-amber-700 px-1.5 py-0.5 rounded transition-colors"
                    }
                  >
                    <Zap size={10} className={fastMode ? "fill-white" : ""} />
                    Hızlı mod {fastMode ? "açık" : "kapalı"}
                  </button>
                </>
              )}
            </div>
            <div className="text-whatsapp-muted text-xs">
              {VIEW_HEADER[activeView].subtitle}
              {activeView === "chat" && fastMode && (
                <span className="ml-2 text-amber-700">· Gemini çağrılmıyor, token korunuyor</span>
              )}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-whatsapp-muted">
            <Video size={18} />
            <Phone size={18} />
            <MoreVertical size={18} />
          </div>
        </header>

        {activeView === "chat" && (
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-8 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-4">
                <span className="bg-white/80 text-whatsapp-muted text-[11px] px-3 py-1 rounded-full shadow-sm border border-whatsapp-border">
                  Bugün
                </span>
              </div>
              {messages.map((m, i) => (
                <MessageBubble key={i} {...m} />
              ))}
              {busy && <TypingIndicator />}
            </div>
          </div>
        )}
        {activeView === "notifications" && (
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <NotificationsPanel phone={activeCustomer.phone} key={activeCustomer.id} />
          </div>
        )}
        {activeView === "campaigns" && (
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <CampaignsPanel onOrderPrompt={startChatWithPrompt} />
          </div>
        )}
        {activeView === "help" && (
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <HelpPanel onAskCirak={() => setActiveView("chat")} />
          </div>
        )}

        {/* Quick suggestions */}
        {activeView === "chat" && messages.length <= 2 && !busy && (
          <div className="px-3 md:px-8 pb-1 max-w-3xl mx-auto w-full">
            <div className="text-whatsapp-muted text-[11px] mb-1.5 uppercase tracking-wide">
              Hızlı sorular
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {DEMO_QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs bg-white hover:bg-whatsapp-panel border border-whatsapp-border text-whatsapp-text px-3 py-1.5 rounded-full transition-colors shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeView === "chat" && (
        <footer className="bg-whatsapp-panel2 px-3 md:px-6 py-2.5 border-t border-whatsapp-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 max-w-3xl mx-auto"
          >
            <button type="button" className="text-whatsapp-muted hover:text-whatsapp-text p-1.5">
              <Smile size={22} />
            </button>
            <button type="button" className="text-whatsapp-muted hover:text-whatsapp-text p-1.5">
              <Paperclip size={20} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Bir mesaj yazın..."
              disabled={busy}
              className="flex-1 bg-white text-whatsapp-text placeholder-whatsapp-muted text-sm px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-emerald-400/50 border border-whatsapp-border disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full p-2.5 transition-colors shadow"
              aria-label="Gönder"
            >
              <Send size={18} />
            </button>
          </form>
        </footer>
        )}
      </section>
    </main>
  );
}

function ContactRow({
  name,
  preview,
  time,
  active,
  badge,
  onClick,
}: {
  name: string;
  preview: string;
  time: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-whatsapp-panel2 border-b border-whatsapp-border transition-colors ${
        active ? "bg-whatsapp-panel3" : ""
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold relative">
        {name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
        {badge && (
          <span className="absolute -bottom-1 -right-1 text-[9px] bg-emerald-500 text-white font-bold rounded-full px-1.5 py-0.5 shadow">
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className="text-whatsapp-text text-[14.5px] font-medium truncate">{name}</span>
          <span className="text-whatsapp-muted text-[11px] ml-2">{time}</span>
        </div>
        <div className="text-whatsapp-muted text-[12.5px] truncate">{preview}</div>
      </div>
    </div>
  );
}
