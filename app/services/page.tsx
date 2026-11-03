import { loadCatalog } from "@/lib/server/catalog";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ServiceBrowser } from "@/components/browser";
import { Eyebrow } from "@/components/brand";
import { CATEGORIES, PRODUCTS } from "@/lib/catalog";
import { fa } from "@/lib/format";

export const metadata: Metadata = {
  title: "همه سرویس‌ها: هوش مصنوعی، طراحی، تلگرام، اپل و شماره مجازی",
  description: `خرید ${fa(PRODUCTS.length)} سرویس دیجیتال با تومان: ${Object.values(CATEGORIES).slice(1).join("، ")}. جست‌وجو بر اساس نام یا کاری که می‌خواهی انجام بدهی.`,
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  await loadCatalog();
  return (
    <main className="sv">
      <div className="wrap sv-top">
        <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><span>همه سرویس‌ها</span></nav>
        <header className="sv-h">
          <Eyebrow>همه سرویس‌ها</Eyebrow>
          <h1>هر سرویسی که لازم داری،<br /><b>در یک جا.</b></h1>
        </header>
      </div>
      <section className="light sv-body">
        <div className="wrap"><Suspense fallback={<div className="sb-wait" />}><ServiceBrowser syncUrl /></Suspense></div>
      </section>
    </main>
  );
}
