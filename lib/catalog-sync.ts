// The live catalog = the built-in catalog (code) + supplier sync (prices and stock) + admin edits (the `products` table).
// The same layers are applied on the server (lib/server/catalog.ts) and in the browser (components/catalog-boot.tsx),
// so every component that reads PRODUCTS sees the same catalog.
//
// Admin edits are three-way merged with the code: a saved edit remembers what the code said when it was saved (`base`).
// When a later deploy changes that same field in code, the code wins, so new versions, options and prices that ship in
// code are never hidden by an old edit. Fields the code did not touch keep the admin's value.
import { ALL_PRODUCTS, PRODUCTS, planAt, type DeliveryType, type Product } from "./catalog";
import { CONTENT, type ProductContent } from "./content";

export type CatalogPatch = {
  id: string;
  /** true for a product that does not exist in code. */
  isNew?: boolean;
  product: Partial<Product>;
  content?: Partial<ProductContent>;
  /** Code values of the edited fields when the edit was saved (null = the code had none). Missing on edits saved before
   *  merging existed («legacy»): those keep only their text and the prices of options the code still has. */
  base?: Record<string, unknown>;
  contentBase?: Record<string, unknown>;
};

/** Supplier sync, per product and option key: the supplier's current cost (`c`), out of stock (`o`) and, for options
 *  without a cost in code (Insight Store), the cost (`b`) and code price (`p`) the selling price was set against. */
export type SupplyState = Record<string, Record<string, { c?: number; o?: 1; b?: number; p?: number }>>;
/** A supplier price move beyond these limits is not followed automatically: a big rise stops the option (no selling at
 *  a loss), a big drop keeps our price. Both show up in the admin panel. */
export const MAX_RISE = 1.6, MAX_DROP = 0.5;

/** Cost ratio of a supplier option vs the cost its selling price was set for (1 = unchanged or unknown). */
export function costRatio(code: Product, plan: string, x: SupplyState[string][string]): number {
  const base = code.qd?.[plan]?.cost ?? code.cb?.[plan]?.cost ?? (x.p === slotPrice(code, plan) ? x.b : undefined);
  if (!x.c || !base) return 1;
  const r = x.c / base;
  return Math.abs(r - 1) < 0.01 ? 1 : r;
}
/** The code's selling price of an option's «code» delivery (USDT when it has one). */
export const slotPrice = (p: Product, plan: string) => planSig(p)[`${plan}|code`];

const BASE: Product[] = structuredClone(ALL_PRODUCTS);
const BASE_CONTENT: Record<string, ProductContent> = structuredClone(CONTENT);
let applied = "";
let last: { rate: number; supply: SupplyState } = { rate: 0, supply: {} };

/** The product as defined in code (no admin edits, no live prices). */
export const codeProduct = (id: string) => BASE.find((p) => p.id === id);
export const codeContent = (id: string): ProductContent | undefined => BASE_CONTENT[id];

const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** What the code says each option costs: its USDT price when it has one, else its Toman price. Keyed «plan|type». */
export function planSig(p: Product): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, o] of Object.entries(p.plans)) for (const [t, v] of Object.entries(o ?? {})) {
    const u = p.usdt?.[k];
    out[`${k}|${t}`] = (typeof u === "number" ? u : u?.[t as DeliveryType]) ?? (v as number);
  }
  return out;
}

/** Applies the supplier sync to a code product: follows the supplier's cost on auto-bought options and marks the ones
 *  it can't deliver. Supplier options are always the «code» delivery type. */
function supplied(p: Product, s: SupplyState[string] | undefined): Product {
  if (!s) return p;
  const c = structuredClone(p);
  const out: string[] = [];
  for (const [k, x] of Object.entries(s)) {
    if (c.plans[k]?.code === undefined) continue;
    const r = costRatio(p, k, x);
    if (x.o || r > MAX_RISE) { out.push(`${k}|code`); continue; }
    if (r === 1 || r < MAX_DROP) continue;
    if (c.qd?.[k]) c.qd[k].cost = x.c!;
    if (c.cb?.[k]) c.cb[k].cost = x.c!;
    const u = c.usdt?.[k];
    if (typeof u === "number") c.usdt![k] = Object.keys(c.plans[k]).length > 1 ? { ...Object.fromEntries(Object.keys(c.plans[k]).map((t) => [t, u])), code: round1(u * r) } : round1(u * r);
    else if (u?.code) c.usdt![k] = { ...u, code: round1(u.code * r) };
    else c.plans[k].code = Math.ceil((c.plans[k].code! * r) / 10_000) * 10_000;
  }
  if (out.length) c.out = out;
  return c;
}
/** Up to the next 0.1 USDT, so a price never drops below the new cost ratio. */
const round1 = (n: number) => Math.ceil(n * 10 - 1e-9) / 10;

/** Product with its USDT-priced options converted at `rate` (Toman per USDT). */
function priced(p: Product, rate: number): Product {
  const c = structuredClone(p);
  if (rate > 0 && c.usdt) for (const [k, v] of Object.entries(c.usdt)) if (c.plans[k]) c.plans[k] = planAt(c.plans[k], v, rate);
  return c;
}

/** Fields an old (legacy) edit may still change: text and numbers the admin types. Everything structural (visibility,
 *  versions, options, category) follows the code, because the old admin form saved every field, edited or not. */
const LEGACY_KEEP = new Set(["name", "maker", "description", "use", "badge", "monogram", "etaMinutes", "includes", "color", "group", "bulk"]);

/** Layers one admin edit over the live product `cur` (code + sync + rate); `code` is the plain code product. */
function merged(cur: Product, code: Product, x: CatalogPatch): Product {
  const legacy = !x.base;
  const next: Product = { ...cur };
  for (const [k, v] of Object.entries(x.product)) {
    if (k === "id" || k === "plans") continue;
    const keep = legacy ? LEGACY_KEEP.has(k) : eq((code as Record<string, unknown>)[k], x.base![k]);
    if (keep) (next as Record<string, unknown>)[k] = v;
  }
  const plans = x.product.plans;
  if (plans) {
    const now = planSig(code);
    if (!legacy && eq(now, x.base!.plans)) next.plans = structuredClone(plans);
    else {
      // The code changed its options since the edit: keep the code's options, with the admin's price on any option
      // whose code price is still what it was when the admin edited it.
      const was = (x.base?.plans ?? null) as Record<string, number> | null;
      next.plans = structuredClone(cur.plans);
      for (const [k, o] of Object.entries(plans)) for (const [t, v] of Object.entries(o ?? {})) {
        const slot = `${k}|${t}`;
        if (next.plans[k]?.[t as DeliveryType] === undefined) continue;
        if (was && was[slot] !== now[slot]) continue;
        next.plans[k][t as DeliveryType] = v as number;
      }
    }
  }
  return next;
}

/** Rebuilds PRODUCTS and CONTENT in place from the code defaults, the supplier sync and admin patches. `rate` (live
 *  Toman per USDT) reprices products that have `usdt` prices; an admin price edit still wins. Cheap to call repeatedly. */
export function applyCatalog(patches: CatalogPatch[], rate = 0, supply: SupplyState = {}) {
  const key = JSON.stringify(patches) + "|" + rate + "|" + JSON.stringify(supply);
  if (key === applied) return;
  applied = key;
  last = { rate, supply };
  const byId = new Map(patches.map((x) => [x.id, x]));
  const next: Product[] = BASE.map((p) => {
    const cur = priced(supplied(p, supply[p.id]), rate);
    const x = byId.get(p.id);
    return x ? { ...merged(cur, p, x), id: p.id } : cur;
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
    const c: Partial<ProductContent> = {};
    for (const [k, v] of Object.entries(x.content ?? {})) {
      // The page address always stays (links point to it); other text follows the code once the code changes it.
      if (k === "slug" || !base || !x.contentBase || eq((base as Record<string, unknown>)[k], x.contentBase[k])) (c as Record<string, unknown>)[k] = v;
    }
    CONTENT[x.id] = { ...(base ?? fallback), ...c };
  }
}

/** Same options and prices as `b`. Options priced in USDT may differ by 3% (the rate moves while the form is open). */
function samePrices(code: Product, a: Product["plans"], b: Product["plans"]) {
  const slots = (x: Product["plans"]) => Object.entries(x).flatMap(([k, o]) => Object.keys(o ?? {}).map((t) => `${k}|${t}`)).sort().join();
  if (slots(a) !== slots(b)) return false;
  return Object.entries(a).every(([k, o]) => Object.entries(o ?? {}).every(([t, v]) => {
    const w = Number(b[k]?.[t as DeliveryType]);
    return code.usdt?.[k] ? Math.abs(Number(v) - w) <= w * 0.03 : Number(v) === w;
  }));
}

/** Turns a full admin form save into a minimal edit: only fields that differ from the code, each with the code value it
 *  was compared to. Prices equal to the unedited live price (within 3% for USDT-priced options) count as unchanged, so
 *  they keep following the Tether rate and the supplier. */
export function minimalPatch(x: CatalogPatch): CatalogPatch {
  const code = codeProduct(x.id);
  if (!code || x.isNew) return x;
  // The product without any admin edit, at the rate and supplier prices the site is using now.
  const live = priced(supplied(code, last.supply[code.id]), last.rate);
  const product: Partial<Product> = {};
  const base: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x.product)) {
    if (k === "id") continue;
    if (k === "plans") {
      if (samePrices(code, v as Product["plans"], live.plans)) continue;
      product.plans = v as Product["plans"];
      base.plans = planSig(code);
      continue;
    }
    const was = (code as Record<string, unknown>)[k];
    const empty = (o: unknown) => o === undefined || o === null || o === "" || o === false || (typeof o === "object" && !Object.keys(o as object).length);
    if (v === undefined || (empty(v) && empty(was))) continue;
    if (eq(v, was) || (v === false && !was) || (Array.isArray(v) && !v.length && !was) || (v === "" && !was)) continue;
    (product as Record<string, unknown>)[k] = v;
    base[k] = was ?? null;
  }
  const cc = codeContent(x.id);
  const content: Partial<ProductContent> = {};
  const contentBase: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x.content ?? {})) {
    const was = (cc as Record<string, unknown> | undefined)?.[k];
    if (eq(v, was)) continue;
    (content as Record<string, unknown>)[k] = v;
    contentBase[k] = was ?? null;
  }
  return { id: x.id, product, content, base, contentBase };
}
