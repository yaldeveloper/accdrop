import type { Metadata } from "next";
import { Suspense } from "react";
import { productById } from "@/lib/catalog";
import { money } from "@/lib/format";
import { loadCatalog } from "@/lib/server/catalog";
import { dbUrl } from "@/lib/server/db";
import { viewSplit } from "@/lib/server/splits";
import { Dong } from "@/components/dong";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

// Link previews in Telegram / WhatsApp show the product and the per-person price.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = (await params).code.toUpperCase();
  const base = { title: "دنگ اشتراک | اک‌دراپ", robots: { index: false } };
  if (!dbUrl()) return base;
  try {
    await loadCatalog();
    const v = await viewSplit(code);
    if (!v) return base;
    const p = productById(v.productId);
    const title = `دنگ ${p.name}: نفری ${money(v.unit)} تومان`;
    const description = `${v.owner} یک گروه ${v.seats} نفره ساخته. هر نفر سهم خودش را می‌دهد و اشتراک جدا روی اکانت خودش می‌گیرد.`;
    return { title, description, robots: { index: false }, openGraph: { title, description, url: `/dong/${code}`, locale: "fa_IR", siteName: "AccDrop" } };
  } catch { return base; }
}

export default async function DongPage({ params }: Props) {
  const { code } = await params;
  return <main className="user-main dg-page"><Suspense><Dong code={code.toUpperCase()} /></Suspense></main>;
}
