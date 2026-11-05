// Admin-edited products are stored as patches in the `products` table and layered over the built-in catalog.
// The same patches are applied on the server (lib/server/catalog.ts) and in the browser (components/catalog-boot.tsx),
// so every component that reads PRODUCTS sees the edited catalog.
import { ALL_PRODUCTS, PRODUCTS, planAt, type Product } from "./catalog";
import { CONTENT, type ProductContent } from "./content";

export type CatalogPatch = {
  id: string;
  /** true for a product that does not exist in code. */
  isNew?: boolean;
  product: Partial<Product>;
  content?: Partial<ProductContent>;
};

const BASE: Product[] = structuredClone(ALL_PRODUCTS);
const BASE_CONTENT: Record<string, ProductContent> = structuredClone(CONTENT);
let applied = "";

/** Product with its USDT-priced options converted at `rate` (Toman per USDT). */
function priced(p: Product, rate: number): Product {
  const c = structuredClone(p);
  if (rate > 0 && c.usdt) for (const [k, v] of Object.entries(c.usdt)) if (c.plans[k]) c.plans[k] = planAt(c.plans[k], v, rate);
  return c;
}

/** Rebuilds PRODUCTS and CONTENT in place from the code defaults plus patches. `rate` (live Toman per USDT) reprices
 *  products that have `usdt` prices; an admin price edit (a patch with `plans`) still wins. Cheap to call repeatedly. */
export function applyCatalog(patches: CatalogPatch[], rate = 0) {
  const key = JSON.stringify(patches) + "|" + rate;
  if (key === applied) return;
  applied = key;
  const byId = new Map(patches.map((x) => [x.id, x]));
  const next: Product[] = BASE.map((p) => {
    const x = byId.get(p.id);
    return x ? { ...priced(p, rate), ...x.product, id: p.id } : priced(p, rate);
  });
  for (const x of patches) {
    if (!x.isNew || BASE.some((p) => p.id === x.id)) continue;
    const p = x.product;
    if (!p.name || !p.plans || !p.category) continue;
    next.push({ maker: "", monogram: p.name.slice(0, 2).toUpperCase(), etaMinutes: 15, description: "", use: "", includes: [], ...p, id: x.id } as Product);
  }
  ALL_PRODUCTS.splice(0, ALL_PRODUCTS.length, ...next);
  PRODUCTS.splice(0, PRODUCTS.length, ...next.filter((p) => !p.hidden));
  for (const k of Object.keys(CONTENT)) if (!BASE_CONTENT[k]) delete CONTENT[k];
  for (const [k, v] of Object.entries(BASE_CONTENT)) CONTENT[k] = structuredClone(v);
  for (const x of patches) {
    const base: ProductContent | undefined = CONTENT[x.id];
    if (!base && !x.isNew) continue;
    const fallback: ProductContent = { slug: x.id, faName: x.product.name ?? x.id, intro: x.product.description ?? "", forWho: [] };
    CONTENT[x.id] = { ...(base ?? fallback), ...x.content };
  }
}
