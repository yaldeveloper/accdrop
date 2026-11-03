import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/inter";
import "./globals.css";
import { Sprites } from "@/components/brand";
import { StoreProvider } from "@/components/store";
import { AccountProvider } from "@/components/account";
import { SiteChrome } from "@/components/chrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://accdrop.ir"),
  title: { default: "اک‌دراپ | خرید اکانت ChatGPT، هوش مصنوعی و نرم‌افزارهای حرفه‌ای", template: "%s | اک‌دراپ" },
  description: "خرید اکانت و اشتراک ChatGPT، Claude، Adobe، تلگرام پرمیوم، گیفت‌کارت اپل، شماره مجازی و سرویس‌های دیجیتال دیگر با تومان؛ تحویل روی ایمیل یا آیدی خودت با ضمانت بازگشت وجه.",
  alternates: { canonical: "/" },
  openGraph: { title: "اک‌دراپ", description: "اشتراک و سرویس‌های دیجیتال، به ساده‌ترین شکل", locale: "fa_IR", siteName: "AccDrop" },
};

export const viewport: Viewport = { themeColor: "#111418", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Sprites />
        <AccountProvider><StoreProvider><SiteChrome>{children}</SiteChrome></StoreProvider></AccountProvider>
      </body>
    </html>
  );
}
