"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ToastKind = "success" | "info" | "error";

export type ToastMessage = {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  duration?: number;
};

type ToastContextType = {
  show: (t: Omit<ToastMessage, "id">) => void;
  success: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (t: Omit<ToastMessage, "id">) => {
      const id = Date.now() + Math.random();
      const toast: ToastMessage = { duration: 3200, ...t, id };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => dismiss(id), toast.duration);
    },
    [dismiss]
  );

  const ctx: ToastContextType = {
    show,
    success: (title, description) => show({ kind: "success", title, description }),
    info: (title, description) => show({ kind: "info", title, description }),
    error: (title, description) => show({ kind: "error", title, description }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none">
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 10);
    return () => clearTimeout(t);
  }, []);

  const palette = {
    success: { Icon: CheckCircle2, ring: "border-emerald-300", bg: "bg-white", icon: "text-emerald-600", bar: "bg-emerald-500" },
    info: { Icon: Info, ring: "border-sky-300", bg: "bg-white", icon: "text-sky-600", bar: "bg-sky-500" },
    error: { Icon: XCircle, ring: "border-rose-300", bg: "bg-white", icon: "text-rose-600", bar: "bg-rose-500" },
  }[toast.kind];

  return (
    <div
      className={`pointer-events-auto relative ${palette.bg} ${palette.ring} border shadow-lg rounded-xl overflow-hidden flex items-start gap-3 p-3 pr-9 transition-all duration-300 ${
        entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${palette.bar}`} />
      <palette.Icon size={20} className={`shrink-0 mt-0.5 ${palette.icon}`} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-slate-800">{toast.title}</div>
        {toast.description && (
          <div className="text-xs text-slate-600 mt-0.5">{toast.description}</div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 p-0.5"
        aria-label="Kapat"
      >
        <X size={14} />
      </button>
    </div>
  );
}
