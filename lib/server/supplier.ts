// Insight Store reseller API: buys redeem codes from a supplier wallet (USDT) and delivers them automatically.
// Set INSIGHT_API_KEY in the environment (never in code). INSIGHT_TEST_MODE=1 sends test orders (TEST- codes, nothing charged).
// Docs: https://api.insightxpro.store/docs
import { ALL_PRODUCTS } from "@/lib/catalog";
import { crSupplyLine } from "./cryptorefills";
import { qdCanSupply, qdSupplyLine } from "./quickdigi";
import { cbCanSupply, cbSupplyLine } from "./canboso";
import { db, dbUrl } from "./db";
import { siteUrl } from "./pay";

const BASE = (process.env.INSIGHT_API_BASE || "https://api.insightxpro.store").replace(/\/$/, "");
export const supplierConfigured = () => !!process.env.INSIGHT_API_KEY;
const testMode = () => process.env.INSIGHT_TEST_MODE === "1";

export type SupplierProduct = {
  id: number; name: string; description: string; howToUse: string;
  /** Our cost in USDT. */
  cost: number; stock: number; available: boolean; unlimited: boolean;
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${process.env.INSIGHT_API_KEY}`);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    if (testMode()) headers.set("x-test-mode", "true");
    const r = await fetch(BASE + path, { ...init, headers, cache: "no-store", signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(`insight ${path} ${r.status}: ${j?.error ?? ""}`), { status: r.status, body: j });
    return j as T;
  } finally { clearTimeout(t); }
}

type RawProduct = { id: number; name: string; description?: string; description_text?: string; how_to_use?: string; base_price_usdt: number | string; stock: number; available?: boolean; unlimited?: boolean };

export async function supplierProducts(): Promise<SupplierProduct[]> {
  const j = await call<{ products: RawProduct[] }>("/api/v1/products?include_unavailable=1");
  const list = (j.products ?? []).map((p) => ({
    id: Number(p.id), name: String(p.name ?? ""), description: String(p.description_text ?? p.description ?? ""), howToUse: String(p.how_to_use ?? ""),
    cost: Number(p.base_price_usdt), stock: Number(p.stock ?? 0), available: p.available !== false && (!!p.unlimited || Number(p.stock ?? 0) > 0), unlimited: !!p.unlimited,
  }));
  g.__ix_stock = { at: Date.now(), list };
  return list;
}

const g = globalThis as unknown as { __ix_stock?: { at: number; list: SupplierProduct[] } };

/** Supplier stock, cached for a minute. null when the API can't be reached (callers then don't block a sale). */
async function cachedStock(): Promise<SupplierProduct[] | null> {
  const c = g.__ix_stock;
  if (c && Date.now() - c.at < 60_000) return c.list;
  try { return await supplierProducts(); } catch (e) { console.error(e); return null; }
}

export async function supplierBalance(): Promise<number> {
  const j = await call<{ balance_usdt: number | string }>("/api/v1/balance");
  return Number(j.balance_usdt);
}

/** Buys `quantity` codes. The idempotency key makes a retry return the same order instead of buying twice. */
export async function supplierBuy(productId: number, quantity: number, idempotencyKey: string): Promise<{ orderId: number; codes: string[]; cost: number }> {
  const j = await call<{ order: { order_id?: number; id?: number; status: string; codes?: string[]; delivered_codes?: string[]; amount_usdt?: number | string; error?: string } }>("/api/v1/orders", {
    method: "POST", body: JSON.stringify({ product_id: productId, quantity, idempotency_key: idempotencyKey, ...(testMode() ? { test: true } : {}) }),
  });
  const o = j.order;
  const codes = (o?.codes ?? o?.delivered_codes ?? []).map(String).filter(Boolean);
  if (!o || o.status !== "completed" || codes.length < quantity) throw new Error(`insight order not completed: ${o?.status} ${o?.error ?? ""}`);
  return { orderId: Number(o.order_id ?? o.id ?? 0), codes, cost: Number(o.amount_usdt ?? 0) };
}

// ----- Mapping: our product + plan → supplier product -----
// Defaults come from `ix` on the products in lib/catalog.ts; rows in supplier_map override them (supplier_id 0 = disconnected).
const codeMap = () => ALL_PRODUCTS.flatMap((p) => Object.entries(p.ix ?? {}).filter(([plan]) => p.plans[plan]?.code).map(([plan, supplierId]) => ({ productId: p.id, plan, supplierId })));

async function dbMap(): Promise<{ productId: string; plan: string; supplierId: number }[]> {
  if (!dbUrl()) return [];
  const sql = await db();
  const rows = await sql`select product_id, plan, supplier_id from supplier_map`;
  return rows.map((r) => ({ productId: r.product_id, plan: r.plan, supplierId: Number(r.supplier_id) }));
}

export async function supplierMap(): Promise<{ productId: string; plan: string; supplierId: number }[]> {
  const rows = await dbMap();
  const key = (m: { productId: string; plan: string }) => `${m.productId}|${m.plan}`;
  const byKey = new Map(codeMap().map((m) => [key(m), m]));
  for (const r of rows) byKey.set(key(r), r);
  return [...byKey.values()].filter((m) => m.supplierId > 0);
}

async function supplierIdOf(productId: string, plan: string): Promise<number | null> {
  const m = (await supplierMap()).find((x) => x.productId === productId && x.plan === plan);
  return m ? m.supplierId : null;
}

export async function setSupplierMap(productId: string, plan: string, supplierId: number | null) {
  const sql = await db();
  const fromCode = codeMap().some((m) => m.productId === productId && m.plan === plan);
  if (!supplierId && !fromCode) await sql`delete from supplier_map where product_id = ${productId} and plan = ${plan}`;
  else await sql`insert into supplier_map (product_id, plan, supplier_id) values (${productId}, ${plan}, ${supplierId ?? 0})
    on conflict (product_id, plan) do update set supplier_id = excluded.supplier_id`;
}

/** Index of the first code line that can't be delivered right now (our own stock is empty and the supplier is out), or -1. */
export async function firstOutOfStock(lines: { id: string; plan: string; type: string; seats?: number }[]): Promise<number> {
  const sql = dbUrl() ? await db() : null;
  let stock: SupplierProduct[] | null | undefined;
  for (const [i, l] of lines.entries()) {
    if (l.type !== "code") continue;
    const prod = ALL_PRODUCTS.find((x) => x.id === l.id);
    const qd = prod?.qd?.[l.plan];
    const cb = prod?.cb?.[l.plan];
    const sid = qd || cb || !supplierConfigured() ? null : await supplierIdOf(l.id, l.plan);
    if (!qd && !cb && !sid) continue;
    const need = Math.max(1, l.seats ?? 1);
    if (sql) {
      const [r] = await sql`select count(*)::int as n from gift_codes where product_id = ${l.id} and plan = ${l.plan} and line_id is null`;
      if (Number(r?.n ?? 0) >= need) continue;
    }
    if (qd) { if (!(await qdCanSupply(qd, need))) return i; continue; }
    if (cb) { if (!(await cbCanSupply(cb, need))) return i; continue; }
    if (stock === undefined) stock = await cachedStock();
    if (!stock) return -1;
    const sp = stock.find((x) => x.id === sid);
    if (!sp || !sp.available || (!sp.unlimited && sp.stock < need)) return i;
  }
  return -1;
}

/** Fetches codes for one paid order line from the supplier, if that product/plan is mapped. Returns null when not mapped. */
export async function supplyLine(lineId: number, productId: string, plan: string, quantity: number): Promise<string[] | null> {
  const p = ALL_PRODUCTS.find((x) => x.id === productId);
  if (p?.cr?.[plan]) return crSupplyLine(lineId, p, plan, quantity, siteUrl());
  if (p?.qd?.[plan]) return qdSupplyLine(lineId, p, plan, quantity);
  if (p?.cb?.[plan]) return cbSupplyLine(lineId, p, plan, quantity);
  if (!supplierConfigured()) return null;
  const sid = await supplierIdOf(productId, plan);
  if (!sid) return null;
  const sql = await db();
  try {
    const r = await supplierBuy(sid, quantity, `accdrop-line-${lineId}`);
    await sql`update order_lines set supply_ref = ${`IX-${r.orderId}`}, supply_cost = ${r.cost} where id = ${lineId}`;
    return r.codes;
  } catch (e) {
    console.error(e);
    await sql`update order_lines set supply_ref = ${"IX-ERR: " + String((e as Error).message).slice(0, 200)} where id = ${lineId}`;
    return null;
  }
}
