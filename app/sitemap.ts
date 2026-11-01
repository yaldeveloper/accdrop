import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { productHref } from "@/lib/content";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://accdrop.ir";
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    ...PRODUCTS.map((p) => ({ url: `${base}${productHref(p)}`, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
