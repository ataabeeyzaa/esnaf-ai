"use client";

import { useEffect, useState } from "react";
import { Bot, Database, Search, Wrench } from "lucide-react";

type Props = {
  label?: string;
};

const STAGES = [
  { icon: Bot, text: "Soruyu analiz ediyor..." },
  { icon: Search, text: "İlgili araç seçiliyor..." },
  { icon: Wrench, text: "Tool çağrılıyor..." },
  { icon: Database, text: "Veritabanı sorgulanıyor..." },
];

export default function TypingIndicator({ label }: Props) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStage((s) => (s + 1) % STAGES.length);
    }, 1100);
    return () => clearInterval(t);
  }, []);

  const current = STAGES[stage];
  const Icon = current.icon;

  return (
    <div className="flex justify-start mb-1.5 animate-fade-in">
      <div className="bg-whatsapp-message rounded-lg rounded-tl-sm px-3 py-2.5 shadow-bubble border border-whatsapp-border min-w-[200px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-whatsapp-muted">
          <Icon size={11} className="text-emerald-600" />
          <span className="transition-opacity duration-200">{label || current.text}</span>
        </div>
      </div>
    </div>
  );
}
