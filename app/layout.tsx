import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/inter";
import "./globals.css";
import { Sprites } from "@/components/brand";
import { StoreProvider } from "@/components/store";

export const metadata: Metadata = {
  metadataBase: new URL("https://accdrop.ir"),
  title: "اک‌دراپ | دسترسی ممتاز به ابزارهای هوشمند",
  description: "اشتراک‌های هوش مصنوعی و نرم‌افزارهای حرفه‌ای، گلچین‌شده، با تحویل سریع و گارانتی تا آخرین روز.",
  openGraph: { title: "اک‌دراپ", description: "دسترسی ممتاز به ابزارهای هوشمند", locale: "fa_IR", siteName: "AccDrop" },
};

export const viewport: Viewport = { themeColor: "#111418", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Sprites />
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
