import { loadCatalog } from "@/lib/server/catalog";
import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { productHref } from "@/lib/content";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await loadCatalog();
  const base = "https://accdrop.ir";
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/services`, changeFrequency: "daily", priority: 0.95 },
    { url: `${base}/packs`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/reseller`, changeFrequency: "monthly", priority: 0.6 },
    ...["guarantee", "terms", "contact"].map((s) => ({ url: `${base}/${s}`, changeFrequency: "yearly" as const, priority: 0.3 })),
    ...PRODUCTS.map((p) => ({ url: `${base}${productHref(p)}`, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
