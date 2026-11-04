// QuickDigi reseller API: ready accounts and codes paid from our QuickDigi Wallet (USDT). Orders are asynchronous:
// we place one, then read it back until its delivery is ready. Docs: https://api.quickdigi.store/api/docs
//
// Environment (set in Vercel, never in code):
//   QUICKDIGI_API_KEY      The full secret from QuickDigi Telegram → 🔑 API (sent as X-API-Key).
//   QD_MAX_ORDER_USDT      Refuse to auto-buy a single line above this (default 14.99; QuickDigi only automates orders below 15).
// Without QUICKDIGI_API_KEY nothing is bought; paid lines wait for the admin.
import type { Product } from "@/lib/catalog";
import { db } from "./db";

const BASE = (process.env.QUICKDIGI_API_BASE || "https://api.quickdigi.store/api/v1").replace(/\/$/, "");
export const qdConfigured = () => !!process.env.QUICKDIGI_API_KEY;
/** QuickDigi fulfils automatically only when an order total is strictly below 15 USDT. */
const maxOrder = () => Math.min(Number(process.env.QD_MAX_ORDER_USDT) || 14.99, 14.99);

async function call<T>(path: string, init: RequestInit & { idem?: string } = {}): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const headers = new Headers(init.headers);
    headers.set("x-api-key", process.env.QUICKDIGI_API_KEY ?? "");
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    if (init.idem) headers.set("idempotency-key", init.idem);
    const r = await fetch(BASE + path, { ...init, headers, cache: "no-store", signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(`quickdigi ${path} ${r.status}: ${j?.error?.code ?? ""}`), { status: r.status, code: j?.error?.code });
    return j as T;
  } finally { clearTimeout(t); }
}

export type QdProduct = { id: string; name: string; price: number; fingerprint: string; available: boolean; stock: number | null; max: number };
type RawProduct = { id: string; name: string; unit_price_usdt: string; price_fingerprint: string; available: boolean; stock: number | null; quantity_limits?: { maximum?: number } };
const toProduct = (p: RawProduct): QdProduct => ({
  id: String(p.id), name: String(p.name ?? ""), price: Number(p.unit_price_usdt), fingerprint: String(p.price_fingerprint ?? ""),
  available: !!p.available, stock: p.stock === null ? null : Number(p.stock ?? 0), max: Number(p.quantity_limits?.maximum ?? 0),
});

/** The whole automatic catalog (paginated by QuickDigi, 100 per page). */
export async function qdProducts(): Promise<QdProduct[]> {
  const out: QdProduct[] = [];
  let after: number | null = 0;
  for (let i = 0; after !== null && i < 20; i++) {
    const j: { items: RawProduct[]; next_after: number | null } = await call(`/products?limit=100&after=${after}`);
    out.push(...(j.items ?? []).map(toProduct));
    after = j.next_after ?? null;
  }
  g.__qd_stock = { at: Date.now(), list: out };
  return out;
}

const g = globalThis as unknown as { __qd_stock?: { at: number; list: QdProduct[] } };

/** Catalog cached for a minute. null when the API can't be reached (callers then don't block a sale). */
async function cachedProducts(): Promise<QdProduct[] | null> {
  const c = g.__qd_stock;
  if (c && Date.now() - c.at < 60_000) return c.list;
  try { return await qdProducts(); } catch (e) { console.error(e); return null; }
}

/** Whether `quantity` of a QuickDigi product can be bought automatically right now. true when unknown (API down). */
export async function qdCanSupply(opt: { id: string; cost: number }, quantity: number): Promise<boolean> {
  if (!qdConfigured()) return true;
  const list = await cachedProducts();
  if (!list) return true;
  const p = list.find((x) => x.id === opt.id);
  if (!p || !p.available || (p.stock !== null && p.stock < quantity) || (p.max && p.max < quantity)) return false;
  return p.price * quantity <= Math.min(maxOrder(), opt.cost * quantity * 1.1 + 0.3);
}

export async function qdBalance(): Promise<{ available: number; reserved: number }> {
  const j = await call<{ available_usdt: string; reserved_usdt: string }>("/balance");
  return { available: Number(j.available_usdt), reserved: Number(j.reserved_usdt) };
}

type QdOrder = { id: string; status: string; commerce_status?: string; fulfillment_status?: string; total_usdt?: string; delivery?: { ready?: boolean } };

/**
 * Advances one paid order line that sells a QuickDigi product and returns its delivery once ready (else null).
 * State lives in order_lines.supply_ref: «QD-NEW» (claimed), «QD-<order id>» (accepted), «QD-ERR: …» (needs the admin).
 * Safe to call repeatedly: the idempotency key is tied to the line, so a line is bought at most once.
 */
export async function qdSupplyLine(lineId: number, p: Product, plan: string, quantity: number): Promise<string[] | null> {
  const opt = p.qd?.[plan];
  if (!opt || !qdConfigured()) return null;
  const sql = await db();
  const [row] = await sql`select supply_ref from order_lines where id = ${lineId}`;
  let ref: string | null = row?.supply_ref ?? null;
  if (ref?.startsWith("QD-ERR") || ref === "QD-NEW") return null;
  const fail = async (msg: string) => { await sql`update order_lines set supply_ref = ${"QD-ERR: " + msg.slice(0, 200)} where id = ${lineId}`; return null; };

  if (!ref) {
    // Claim the line first so two concurrent calls can never buy twice.
    const claimed = await sql`update order_lines set supply_ref = 'QD-NEW' where id = ${lineId} and supply_ref is null returning id`;
    if (!claimed.length) return null;
    try {
      const q = toProduct(await call<RawProduct>(`/products/${encodeURIComponent(opt.id)}`));
      const total = q.price * quantity;
      if (!q.available || (q.stock !== null && q.stock < quantity)) return fail(`${opt.id} out of stock`);
      // Never pay far above the price list, nor at or above QuickDigi's automatic limit.
      if (!(q.price > 0) || total > opt.cost * quantity * 1.1 + 0.3 || total > maxOrder()) return fail(`${opt.id} price ${q.price} USDT, expected ~${opt.cost}`);
      const body = { product_id: opt.id, quantity, unit_price_usdt: q.price.toFixed(2), price_fingerprint: q.fingerprint, inputs: {} };
      const j = await call<{ order: QdOrder }>("/orders", { method: "POST", body: JSON.stringify(body), idem: `accdrop-line-${lineId}` });
      if (!j.order?.id) return fail("no order id");
      ref = `QD-${j.order.id}`;
      await sql`update order_lines set supply_ref = ${ref}, supply_cost = ${Number(j.order.total_usdt ?? total)} where id = ${lineId}`;
    } catch (e) {
      console.error(e);
      // Nothing was committed when the Wallet is short: release the claim so the line is bought once the Wallet is funded.
      if ((e as { code?: string }).code === "insufficient_funds") {
        await sql`update order_lines set supply_ref = null where id = ${lineId} and supply_ref = 'QD-NEW'`;
        return null;
      }
      // A timeout or 5xx after sending may still have been accepted: check the QuickDigi order list before buying by hand.
      const status = (e as { status?: number }).status;
      return fail(`${!status || status >= 500 ? "may be accepted, check QuickDigi orders: " : ""}${String((e as Error).message)}`);
    }
  }

  const orderId = ref.slice(3);
  try {
    const o = await call<QdOrder>(`/orders/${encodeURIComponent(orderId)}`);
    if (o.status === "failed" || o.status === "manual_review") return fail(`${ref} ${o.status} ${o.commerce_status ?? ""}/${o.fulfillment_status ?? ""}`);
    if (o.status !== "fulfilled" || !o.delivery?.ready) return null;
    const d = await call<{ items?: string[] }>(`/orders/${encodeURIComponent(orderId)}/delivery`);
    const items = (d.items ?? []).map(String).filter((x) => x.trim());
    return items.length ? items : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
