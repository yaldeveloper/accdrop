// 5sim.net: live virtual numbers for SMS verification (Telegram, WhatsApp, …), bought automatically after payment.
// Set FIVESIM_API_KEY in the environment (never in code). Docs: https://5sim.net/docs
// Pricing: 5sim cost → Toman with the live USDT rate (Nobitex/Wallex, see crypto.ts) plus FIVESIM_MARKUP percent.
//   FIVESIM_CURRENCY   RUB (default) or USD: the currency of the 5sim account's balance and prices.
//   FIVESIM_RUB_PER_USD  roubles per dollar when the account is in RUB (default 90).
//   FIVESIM_MARKUP     our margin in percent (default 35).  FIVESIM_MIN_TOMAN  lowest price we sell at (default 40000).
import { db } from "./db";
import { usdtRate } from "./crypto";
import { MAX_NUMBER_TRIES, NUMBER_SERVICES, countryFa, livePlan, type NumberState } from "@/lib/numbers";

const BASE = (process.env.FIVESIM_API_BASE || "https://5sim.net/v1").replace(/\/$/, "");
export const fivesimConfigured = () => !!process.env.FIVESIM_API_KEY;
const g = globalThis as unknown as { __acc_5s?: Record<string, { at: number; data: unknown }> };
const cache = (g.__acc_5s ??= {});

export const fivesimSettings = () => {
  const currency = (process.env.FIVESIM_CURRENCY || "RUB").toUpperCase() === "USD" ? "USD" : "RUB";
  return {
    currency,
    perUsd: currency === "USD" ? 1 : Math.max(1, Number(process.env.FIVESIM_RUB_PER_USD) || 90),
    markup: Math.max(0, Number(process.env.FIVESIM_MARKUP ?? 35) || 0),
    min: Math.max(0, Number(process.env.FIVESIM_MIN_TOMAN) || 40000),
  };
};

class FivesimError extends Error { constructor(msg: string, public status: number) { super(msg); } }

async function call<T>(path: string, auth = true): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (auth || process.env.FIVESIM_API_KEY) headers.authorization = `Bearer ${process.env.FIVESIM_API_KEY ?? ""}`;
    const r = await fetch(BASE + path, { headers, cache: "no-store", signal: ctl.signal });
    const text = await r.text();
    let j: unknown;
    try { j = JSON.parse(text); } catch { j = undefined; }
    // 5sim answers some errors as plain text with status 200, e.g. "no free phones" or "not enough user balance".
    if (!r.ok || j === undefined) throw new FivesimError(`5sim ${path.split("?")[0]} ${r.status}: ${text.slice(0, 120)}`, r.status);
    return j as T;
  } finally { clearTimeout(t); }
}

async function cached<T>(key: string, ttl: number, get: () => Promise<T>): Promise<T> {
  const c = cache[key];
  if (c && Date.now() - c.at < ttl) return c.data as T;
  try {
    const data = await get();
    cache[key] = { at: Date.now(), data };
    return data;
  } catch (e) {
    if (c) return c.data as T; // keep serving the last answer while 5sim is unreachable
    throw e;
  }
}

// ----- Prices -----
type Op = { cost: number; count: number; rate?: number };
type PriceTable = Record<string, Record<string, Op>>; // country → operator → price

/** 5sim prices of one service, by country and operator (cached 3 minutes). */
async function servicePrices(service: string): Promise<PriceTable> {
  return cached(`p:${service}`, 3 * 60_000, async () => {
    const j = await call<Record<string, Record<string, Record<string, Op>>>>(`/guest/prices?product=${encodeURIComponent(service)}`, false);
    // The answer is { <product>: { <country>: { <operator>: {cost,count} } } }.
    const t = j[service] ?? {};
    const out: PriceTable = {};
    for (const [country, ops] of Object.entries(t)) {
      out[country] = {};
      for (const [op, v] of Object.entries(ops ?? {})) {
        const cost = Number(v?.cost), count = Number(v?.count);
        if (Number.isFinite(cost) && cost > 0) out[country][op] = { cost, count: Number.isFinite(count) ? count : 0 };
      }
    }
    return out;
  });
}

/** English country names from 5sim (cached a day; empty when unreachable). */
async function countryNames(): Promise<Record<string, { en: string; iso: string }>> {
  return cached("countries", 86_400_000, async () => {
    const j = await call<Record<string, { text_en?: string; iso?: Record<string, unknown> }>>("/guest/countries", false);
    // iso is { "gb": 1 }: the key is the two-letter country code (used for the flag).
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, { en: String(v?.text_en ?? k), iso: Object.keys(v?.iso ?? {})[0] ?? "" }]));
  }).catch(() => ({}));
}

/** Toman per one unit of the 5sim account currency, today. */
async function tomanPerUnit() {
  const s = fivesimSettings();
  const { rate } = await usdtRate();
  return rate / s.perUsd;
}

const sellPrice = (cost: number, perUnit: number) => {
  const s = fivesimSettings();
  return Math.max(s.min, Math.ceil((cost * perUnit * (1 + s.markup / 100)) / 1000) * 1000);
};

/** Cheapest operator that has numbers in stock, then the rest by price. */
const byPrice = (ops: Record<string, Op>) => Object.entries(ops).filter(([, o]) => o.count > 0).sort((a, b) => a[1].cost - b[1].cost);

export type LiveOffer = { country: string; name: string; iso: string; price: number; count: number };

/** Every country that has numbers for this service, with our Toman price, cheapest first. */
export async function liveOffers(service: string): Promise<LiveOffer[]> {
  if (!NUMBER_SERVICES.some((s) => s.id === service)) return [];
  const [t, names, perUnit] = await Promise.all([servicePrices(service), countryNames(), tomanPerUnit()]);
  return Object.entries(t).flatMap(([country, ops]) => {
    const best = byPrice(ops);
    if (!best.length) return [];
    return [{ country, name: countryFa(country, names[country]?.en), iso: /^[a-z]{2}$/.test(names[country]?.iso ?? "") ? names[country].iso : "", price: sellPrice(best[0][1].cost, perUnit), count: best.reduce((s, [, o]) => s + o.count, 0) }];
  }).sort((a, b) => a.price - b.price);
}

/** Our Toman price for one country + service right now, or null when it is out of stock. */
export async function livePrice(plan: string): Promise<number | null> {
  const l = livePlan(plan);
  if (!l || !NUMBER_SERVICES.some((s) => s.id === l.service)) return null;
  const [t, perUnit] = await Promise.all([servicePrices(l.service), tomanPerUnit()]);
  const best = byPrice(t[l.country] ?? {});
  return best.length ? sellPrice(best[0][1].cost, perUnit) : null;
}

// ----- Account and orders -----
export async function fivesimBalance(): Promise<number> {
  const j = await call<{ balance?: number | string; frozen_balance?: number | string }>("/user/profile");
  return Number(j.balance ?? 0);
}

type RawOrder = {
  id: number; phone?: string; operator?: string; product?: string; price?: number | string; status?: string; expires?: string; country?: string;
  sms?: { created_at?: string; date?: string; sender?: string; text?: string; code?: string }[] | null;
};

/** What we keep about a line's number in order_lines.num. */
export type NumRecord = NumberState & { id?: number; cost?: number; operator?: string; country?: string; error?: string; history?: { id: number; phone?: string; status: string }[] };

const toState = (o: RawOrder, prev: NumRecord): NumRecord => ({
  ...prev,
  id: Number(o.id), phone: o.phone ?? prev.phone, operator: o.operator ?? prev.operator, country: o.country ?? prev.country,
  cost: o.price !== undefined ? Number(o.price) : prev.cost,
  status: (String(o.status ?? "PENDING").toUpperCase() as NumberState["status"]),
  expiresAt: o.expires ? new Date(o.expires).getTime() : prev.expiresAt,
  codes: (o.sms ?? []).map((m) => ({ code: String(m.code ?? ""), text: String(m.text ?? ""), at: new Date(m.created_at ?? m.date ?? Date.now()).getTime() })),
  error: undefined,
});

/** Buys a number for a paid line. The cost limit keeps us from buying above what the customer paid. */
async function buyNumber(plan: string, maxToman: number): Promise<RawOrder> {
  const l = livePlan(plan)!;
  const [t, perUnit] = await Promise.all([servicePrices(l.service), tomanPerUnit()]);
  const cap = maxToman / perUnit; // break-even in 5sim currency
  const ops = byPrice(t[l.country] ?? {}).filter(([, o]) => o.cost <= cap).slice(0, 3);
  let last: unknown = new Error("no_offer");
  for (const [op] of ops) {
    try {
      return await call<RawOrder>(`/user/buy/activation/${encodeURIComponent(l.country)}/${encodeURIComponent(op)}/${encodeURIComponent(l.service)}`);
    } catch (e) {
      last = e;
      // Out of numbers on this operator: try the next one. Anything else (balance, auth) stops here.
      if (!/no free phones|not available|no product/i.test(String((e as Error).message))) break;
    }
  }
  throw last;
}

/** Reads a line's number record. */
export async function numRecord(lineId: number): Promise<NumRecord | null> {
  const sql = await db();
  const [r] = await sql`select num from order_lines where id = ${lineId}`;
  return (r?.num as NumRecord) ?? null;
}
async function saveNum(lineId: number, n: NumRecord, phone?: string) {
  const sql = await db();
  await sql`update order_lines set num = ${sql.json(n as never)},
    supply_ref = ${n.id ? `5S-${n.id}` : n.error ? `5S-ERR: ${n.error.slice(0, 180)}` : null},
    supply_cost = ${n.cost ?? null}
    ${phone ? sql`, secret = ${phone}, delivered_at = coalesce(delivered_at, now())` : sql``}
    where id = ${lineId}`;
}

/**
 * Gets a number for a paid live-number line, once: a line that already has a number (or is being bought) is left alone.
 * Returns true when the line now has a number.
 */
export async function supplyNumber(lineId: number, plan: string, price: number, retry = false): Promise<boolean> {
  if (!fivesimConfigured() || !livePlan(plan)) return false;
  const sql = await db();
  const prev = (await numRecord(lineId)) ?? { status: "BUYING", codes: [], tries: 0 } as NumRecord;
  if (prev.tries >= MAX_NUMBER_TRIES) return false;
  // Claim the line so two requests never buy two numbers for it.
  const claim = { ...prev, status: "BUYING", codes: [], tries: prev.tries + 1, error: undefined } as NumRecord;
  const ok = retry
    ? await sql`update order_lines set num = ${sql.json(claim as never)} where id = ${lineId} and (num->>'status') in ('CANCELED', 'TIMEOUT', 'BANNED', 'FAILED') returning id`
    : await sql`update order_lines set num = ${sql.json(claim as never)} where id = ${lineId} and num is null returning id`;
  if (!ok.length) return false;
  try {
    const o = await buyNumber(plan, price);
    const n = toState(o, { ...claim, history: [...(prev.history ?? []), ...(prev.id ? [{ id: prev.id, phone: prev.phone, status: prev.status }] : [])] });
    await saveNum(lineId, n, n.phone);
    return true;
  } catch (e) {
    console.error(e);
    await saveNum(lineId, { ...claim, status: "FAILED", error: String((e as Error).message) });
    return false;
  }
}

/** Fetches the latest state (and any SMS codes) of a line's number from 5sim and stores it. */
export async function refreshNumber(lineId: number): Promise<NumRecord | null> {
  const n = await numRecord(lineId);
  if (!n?.id || !fivesimConfigured()) return n;
  // Finished states don't change any more; don't call 5sim for them.
  if (n.status !== "PENDING" && n.status !== "RECEIVED") return n;
  try {
    const next = toState(await call<RawOrder>(`/user/check/${n.id}`), n);
    if (JSON.stringify(next) !== JSON.stringify(n)) await saveNum(lineId, next);
    return next;
  } catch (e) {
    console.error(e);
    return n;
  }
}

/** Cancels a number that has not received a code (5sim returns its cost to our balance). */
export async function cancelNumber(lineId: number): Promise<NumRecord | null> {
  const n = await refreshNumber(lineId);
  if (!n?.id || n.status !== "PENDING" || n.codes.length) return n;
  try {
    const next = toState(await call<RawOrder>(`/user/cancel/${n.id}`), n);
    await saveNum(lineId, next);
    return next;
  } catch (e) {
    console.error(e);
    return n;
  }
}

/** Closes a number that got its code, so 5sim stops holding it. */
export async function finishNumber(lineId: number) {
  const n = await numRecord(lineId);
  if (!n?.id || n.status !== "RECEIVED") return;
  try { await saveNum(lineId, toState(await call<RawOrder>(`/user/finish/${n.id}`), n)); } catch (e) { console.error(e); }
}

/** The part of a number record the customer may see. */
export const publicNumber = (n: NumRecord | null): NumberState | undefined => n ? {
  status: n.status, phone: n.phone, expiresAt: n.expiresAt, codes: n.codes ?? [], tries: n.tries ?? 0,
  canRetry: (n.tries ?? 0) < MAX_NUMBER_TRIES && !(n.codes ?? []).length && ["CANCELED", "TIMEOUT", "BANNED", "FAILED"].includes(n.status),
} : undefined;
