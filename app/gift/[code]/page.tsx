import type { Metadata } from "next";
import { GiftReveal } from "@/components/gift";
import { cleanCode } from "@/lib/gift";

// A private link: keep it out of search results.
export const metadata: Metadata = { title: "یک هدیه برای تو", robots: { index: false, follow: false } };

export default async function GiftLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <main className="gift-main"><GiftReveal code={cleanCode(decodeURIComponent(code))} /></main>;
}
