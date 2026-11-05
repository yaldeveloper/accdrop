import { loadCatalog } from "@/lib/server/catalog";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Finder } from "@/components/finder";
import { Eyebrow } from "@/components/brand";

export const metadata: Metadata = {
  title: "ابزاریاب: برای کارت کدام هوش مصنوعی را بخری؟",
  description: "بگو می‌خواهی چه کار کنی، برنامه‌نویسی، ساخت ویدیو، تحقیق، ارائه یا یادگیری زبان، تا بهترین ابزار هوش مصنوعی و گزینه اقتصادی‌اش را پیشنهاد بدهیم.",
  alternates: { canonical: "/finder" },
};

export default async function FinderPage() {
  await loadCatalog();
  return (
    <main className="fdp">
      <div className="fdp-glow" aria-hidden />
      <div className="wrap fdp-top">
        <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><span>ابزاریاب</span></nav>
        <Eyebrow>ابزاریاب</Eyebrow>
        <h1>می‌خواهی <b>چه کار</b> کنی؟</h1>
        <p className="fdp-lead">بگو، ما از بین ابزارهای فروشگاه بهترینش را پیشنهاد می‌دهیم؛ به‌همراه دلیلش و یک گزینه اقتصادی.</p>
        <Suspense fallback={<div className="fd-wait" />}><Finder /></Suspense>
      </div>
    </main>
  );
}
