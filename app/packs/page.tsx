import type { Metadata } from "next";
import Link from "next/link";
import { ComboGrid } from "@/components/combos";
import { Eyebrow } from "@/components/brand";
import { COMBOS } from "@/lib/combos";
import { loadCatalog } from "@/lib/server/catalog";

export const metadata: Metadata = {
  title: "کمبو پک: ChatGPT و ابزارهای هوش مصنوعی با هم، ارزان‌تر",
  description: `${COMBOS.map((c) => c.name).join("، ")}. چند سرویس با یک پرداخت، ارزان‌تر از خرید جدا و با تحویل خودکار.`,
  alternates: { canonical: "/packs" },
};

export default async function PacksPage() {
  await loadCatalog();
  return (
    <main className="cb-page">
      <div className="wrap sv-top">
        <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><span>کمبو پک‌ها</span></nav>
        <header className="sv-h">
          <Eyebrow>کمبو پک</Eyebrow>
          <h1>هر کاری، <b>پک خودش.</b></h1>
          <p className="muted cb-lead">سرویس‌هایی که برای یک کار کنار هم لازم می‌شوند را یک‌جا بخر و کمتر بپرداز. هر سرویس بعد از پرداخت جدا و خودکار تحویل می‌شود و گارانتی خودش را دارد.</p>
        </header>
      </div>
      <section className="cb cb-all">
        <div className="wrap"><ComboGrid /></div>
      </section>
    </main>
  );
}
