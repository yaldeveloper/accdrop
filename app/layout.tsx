import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/inter";
import "./globals.css";
import { Sprites } from "@/components/brand";
import { StoreProvider } from "@/components/store";
import { AccountProvider } from "@/components/account";
import { SiteChrome } from "@/components/chrome";
import { CatalogBoot } from "@/components/catalog-boot";
import { catalogRate, loadCatalog } from "@/lib/server/catalog";

/** Product edits from the admin panel reach static pages within a minute (and instantly via revalidatePath). */
export const revalidate = 60;

export const metadata: Metadata = {
  metadataBase: new URL("https://accdrop.ir"),
  title: { default: "اک‌دراپ | خرید اکانت ChatGPT، هوش مصنوعی و نرم‌افزارهای حرفه‌ای", template: "%s | اک‌دراپ" },
  description: "خرید ChatGPT Plus، Manus، Lovable، CapCut، ElevenLabs، LinkedIn Premium و سرویس‌های دیجیتال دیگر با تومان؛ کد رسمی یا اکانت آماده با تحویل فوری و ضمانت بازگشت وجه.",
  alternates: { canonical: "/" },
  openGraph: { title: "اک‌دراپ", description: "اشتراک و سرویس‌های دیجیتال، به ساده‌ترین شکل", locale: "fa_IR", siteName: "AccDrop" },
};

export const viewport: Viewport = { themeColor: "#111418", viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const catalog = await loadCatalog();
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Sprites />
        <CatalogBoot data={catalog} rate={catalogRate()}><AccountProvider><StoreProvider><SiteChrome>{children}</SiteChrome></StoreProvider></AccountProvider></CatalogBoot>
      </body>
    </html>
  );
}
