import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/inter";
import "./globals.css";
import { Sprites } from "@/components/brand";
import { StoreProvider } from "@/components/store";
import { SiteChrome } from "@/components/chrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://accdrop.ir"),
  title: { default: "اک‌دراپ | خرید اکانت ChatGPT، هوش مصنوعی و نرم‌افزارهای حرفه‌ای", template: "%s | اک‌دراپ" },
  description: "خرید اکانت و اشتراک ChatGPT، Claude، Cursor، Adobe، Canva و ابزارهای حرفه‌ای دیگر با تومان؛ فعال‌سازی روی ایمیل خودت در چند دقیقه و گارانتی تا روز آخر.",
  alternates: { canonical: "/" },
  openGraph: { title: "اک‌دراپ", description: "دسترسی ممتاز به ابزارهای هوشمند", locale: "fa_IR", siteName: "AccDrop" },
};

export const viewport: Viewport = { themeColor: "#111418", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Sprites />
        <StoreProvider><SiteChrome>{children}</SiteChrome></StoreProvider>
      </body>
    </html>
  );
}
