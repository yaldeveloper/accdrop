// Insight Store reseller API: buys redeem codes from a supplier wallet (USDT) and delivers them automatically.
// Set INSIGHT_API_KEY in the environment (never in code). INSIGHT_TEST_MODE=1 sends test orders (TEST- codes, nothing charged).
// Docs: https://api.insightxpro.store/docs
import { db } from "./db";

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
  return (j.products ?? []).map((p) => ({
    id: Number(p.id), name: String(p.name ?? ""), description: String(p.description_text ?? p.description ?? ""), howToUse: String(p.how_to_use ?? ""),
    cost: Number(p.base_price_usdt), stock: Number(p.stock ?? 0), available: p.available !== false && Number(p.stock ?? 0) > 0, unlimited: !!p.unlimited,
  }));
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
export async function supplierMap(): Promise<{ productId: string; plan: string; supplierId: number }[]> {
  const sql = await db();
  const rows = await sql`select product_id, plan, supplier_id from supplier_map`;
  return rows.map((r) => ({ productId: r.product_id, plan: r.plan, supplierId: Number(r.supplier_id) }));
}

export async function setSupplierMap(productId: string, plan: string, supplierId: number | null) {
  const sql = await db();
  if (!supplierId) await sql`delete from supplier_map where product_id = ${productId} and plan = ${plan}`;
  else await sql`insert into supplier_map (product_id, plan, supplier_id) values (${productId}, ${plan}, ${supplierId})
    on conflict (product_id, plan) do update set supplier_id = excluded.supplier_id`;
}

/** Fetches codes for one paid order line from the supplier, if that product/plan is mapped. Returns null when not mapped. */
export async function supplyLine(lineId: number, productId: string, plan: string, quantity: number): Promise<string[] | null> {
  if (!supplierConfigured()) return null;
  const sql = await db();
  const [m] = await sql`select supplier_id from supplier_map where product_id = ${productId} and plan = ${plan}`;
  if (!m) return null;
  try {
    const r = await supplierBuy(Number(m.supplier_id), quantity, `accdrop-line-${lineId}`);
    await sql`update order_lines set supply_ref = ${`IX-${r.orderId}`}, supply_cost = ${r.cost} where id = ${lineId}`;
    return r.codes;
  } catch (e) {
    console.error(e);
    await sql`update order_lines set supply_ref = ${"IX-ERR: " + String((e as Error).message).slice(0, 200)} where id = ${lineId}`;
    return null;
  }
}
