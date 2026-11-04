// Canboso buyer API: ready accounts and activation links paid from our Canboso wallet (USD, topped up with USDT through
// the Canboso Binance bot). A purchase is answered at once with the delivered accounts. Docs: https://canboso.com/api/swagger
//
// Environment (set in Vercel, never in code):
//   CANBOSO_API_KEY     The buyer key from the Canboso bot (tgb_…), sent as x-buyer-key.
//   CB_MAX_ORDER_USD    Refuse to auto-buy a single line above this (default 25).
// Without CANBOSO_API_KEY nothing is bought; paid lines wait for the admin.
import type { Product } from "@/lib/catalog";
import { db } from "./db";

const BASE = (process.env.CANBOSO_API_BASE || "https://canboso.com/api/v2/telegram-buyer").replace(/\/$/, "");
export const cbConfigured = () => !!process.env.CANBOSO_API_KEY;
const maxOrder = () => Number(process.env.CB_MAX_ORDER_USD) || 25;

type ErrBody = { success?: boolean; message?: string; code?: string; payment?: { balance?: number } };

async function call<T>(path: string, init: RequestInit & { idem?: string } = {}): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25000);
  try {
    const headers = new Headers(init.headers);
    headers.set("x-buyer-key", process.env.CANBOSO_API_KEY ?? "");
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    if (init.idem) headers.set("idempotency-key", init.idem);
    const r = await fetch(BASE + path, { ...init, headers, cache: "no-store", signal: ctl.signal });
    const j = (await r.json().catch(() => ({}))) as ErrBody;
    if (!r.ok || j.success === false) {
      throw Object.assign(new Error(`canboso ${path} ${r.status}: ${j.code ?? j.message ?? ""}`), { status: r.status, body: j });
    }
    return j as T;
  } finally { clearTimeout(t); }
}

export type CbProduct = { id: string; name: string; type: string; price: number; currency: string; available: number | null };
type RawProduct = { productId: string; name: string; productType: string; price: { amount: number; currency: string }; availability?: { available?: number | null } };
const toProduct = (p: RawProduct): CbProduct => ({
  id: String(p.productId), name: String(p.name ?? ""), type: String(p.productType ?? "account"),
  price: Number(p.price?.amount), currency: String(p.price?.currency ?? ""),
  available: p.availability?.available === null || p.availability?.available === undefined ? null : Number(p.availability.available),
});

export async function cbProducts(): Promise<CbProduct[]> {
  const j = await call<{ walletCurrency?: string; products: RawProduct[] }>("/products");
  const list = (j.products ?? []).map(toProduct);
  g.__cb_stock = { at: Date.now(), list };
  return list;
}

const g = globalThis as unknown as { __cb_stock?: { at: number; list: CbProduct[] } };

/** Catalog cached for a minute (Canboso allows 30 product reads a minute). null when the API can't be reached. */
async function cachedProducts(fresh = false): Promise<CbProduct[] | null> {
  const c = g.__cb_stock;
  if (!fresh && c && Date.now() - c.at < 60_000) return c.list;
  try { return await cbProducts(); } catch (e) { console.error(e); return fresh ? null : c?.list ?? null; }
}

/** Never pay far above the price list. Canboso prices are in USD (= USDT). */
const priceOk = (p: CbProduct, opt: { cost: number }, quantity: number) =>
  p.price > 0 && p.currency === "USD" && p.price * quantity <= Math.min(maxOrder(), opt.cost * quantity * 1.1 + 0.3);

/**
 * Whether `quantity` of a Canboso product can be bought right now. Canboso keeps only a handful of each item,
 * so an unknown stock (API down) counts as out: the sale would otherwise wait on the admin.
 */
export async function cbCanSupply(opt: { id: string; cost: number }, quantity: number): Promise<boolean> {
  if (!cbConfigured()) return false;
  const list = await cachedProducts();
  const p = list?.find((x) => x.id === opt.id);
  if (!p || p.type !== "account") return false;
  if (p.available !== null && p.available < quantity) return false;
  return priceOk(p, opt, quantity);
}

export async function cbBalance(): Promise<{ balance: number; currency: string }> {
  const j = await call<{ balance: number; walletCurrency: string }>("/balance");
  return { balance: Number(j.balance ?? 0), currency: String(j.walletCurrency ?? "") };
}

type Account = { user?: string; password?: string; verifyEmail?: string | null; expiryText?: string | null; otherInfo?: string | null };
type Purchase = { order: { orderCode: string; status: string; finalQuantity?: number }; payment: { amount: number; currency: string }; delivery?: { accounts?: Account[] } };

/** One delivered account as a single line: «user | password | recovery email | note». */
const accountLine = (a: Account) => [a.user, a.password, a.verifyEmail, a.otherInfo, a.expiryText].map((x) => String(x ?? "").trim()).filter(Boolean).join(" | ");

/**
 * Buys and delivers one paid order line that sells a Canboso product (returns null when it can't yet).
 * State lives in order_lines.supply_ref: «CB-NEW» (claimed), «CB-<order code>» (bought), «CB-ERR: …» (needs the admin).
 * The idempotency key is tied to the line, so a retry after a timeout returns the original purchase instead of buying twice.
 */
export async function cbSupplyLine(lineId: number, p: Product, plan: string, quantity: number): Promise<string[] | null> {
  const opt = p.cb?.[plan];
  if (!opt || !cbConfigured()) return null;
  const sql = await db();
  const [row] = await sql`select supply_ref from order_lines where id = ${lineId}`;
  const ref: string | null = row?.supply_ref ?? null;
  if (ref && ref !== "CB-NEW") return null;
  const fail = async (msg: string) => { await sql`update order_lines set supply_ref = ${"CB-ERR: " + msg.slice(0, 200)} where id = ${lineId}`; return null; };
  const release = async () => { await sql`update order_lines set supply_ref = null where id = ${lineId} and supply_ref = 'CB-NEW'`; return null; };

  // «CB-NEW» left from an earlier attempt that never got an answer: the retry below reuses the same idempotency key.
  if (!ref) {
    const claimed = await sql`update order_lines set supply_ref = 'CB-NEW' where id = ${lineId} and supply_ref is null returning id`;
    if (!claimed.length) return null;
    const list = await cachedProducts(true);
    if (!list) return release(); // Canboso unreachable, nothing bought yet: try again on the next check.
    const cp = list.find((x) => x.id === opt.id);
    if (!cp || (cp.available !== null && cp.available < quantity)) return fail(`${opt.id} out of stock`);
    if (!priceOk(cp, opt, quantity)) return fail(`${opt.id} price ${cp.price} ${cp.currency}, expected ~${opt.cost}`);
  }

  try {
    const j = await call<Purchase>("/purchase", {
      method: "POST", idem: `accdrop-line-${lineId}`,
      body: JSON.stringify({ key: process.env.CANBOSO_API_KEY, product_id: opt.id, quantity }),
    });
    const lines = (j.delivery?.accounts ?? []).map(accountLine).filter(Boolean);
    await sql`update order_lines set supply_ref = ${`CB-${j.order?.orderCode ?? "?"}`}, supply_cost = ${Number(j.payment?.amount ?? opt.cost * quantity)} where id = ${lineId}`;
    if (j.order?.status !== "completed" || lines.length < quantity) {
      await fail(`CB-${j.order?.orderCode} ${j.order?.status}: delivered ${lines.length}/${quantity}, check Canboso orders`);
      return null;
    }
    return lines;
  } catch (e) {
    console.error(e);
    const err = e as { status?: number; body?: ErrBody };
    // No answer, rate limit or server error: the purchase may or may not exist. Keep «CB-NEW» and retry with the same key.
    if (!err.status || err.status === 429 || err.status >= 500) return null;
    // A short wallet answers with the current balance: nothing was bought, so wait until the wallet is topped up.
    if (err.body?.payment) return release();
    return fail(String((e as Error).message));
  }
}
