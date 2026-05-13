import "./globals.css";
import type { Metadata } from "next";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Çırak — KOBİ'nin yapay zeka çırağı",
  description:
    "Çoklu-ajan yapay zeka ile KOBİ ve kooperatifler için müşteri iletişimi, stok, sipariş ve kargo otomasyonu.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
