// Crypto payments through NOWPayments (USDT and other coins; the customer picks the coin on the invoice page).
// Set NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET to go live. Amounts are converted with the live USDT/Toman rate
// (Nobitex, then Wallex); CRYPTO_RATE_TOMAN is only the fallback when both are unreachable.
// Without an API key, crypto orders go through the built-in test gateway like card orders do.
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "./pay";

export const cryptoConfigured = () => !!process.env.NOWPAYMENTS_API_KEY;
const g = globalThis as unknown as { __acc_usdt?: { at: number; rate: number; source: string } };
const fallbackRate = () => Math.max(1000, Number(process.env.CRYPTO_RATE_TOMAN) || 270000);
const sane = (n: number) => Number.isFinite(n) && n > 10_000 && n < 10_000_000;

async function getJson(url: string) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(url, { cache: "no-store", signal: ctl.signal, headers: { accept: "application/json" } });
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(t); }
}

/** Live Toman price of one Tether (USDT) from Iranian exchanges, cached 5 minutes. Falls back to CRYPTO_RATE_TOMAN. */
export async function usdtRate(): Promise<{ rate: number; source: string }> {
  const c = g.__acc_usdt;
  if (c && Date.now() - c.at < 5 * 60_000) return c;
  const sources: [string, () => Promise<number>][] = [
    ["nobitex", async () => Number((await getJson("https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls"))?.stats?.["usdt-rls"]?.latest) / 10],
    ["wallex", async () => Number((await getJson("https://api.wallex.ir/v1/markets"))?.result?.symbols?.USDTTMN?.stats?.lastPrice)],
  ];
  for (const [source, get] of sources) {
    const rate = Math.round(await get().catch(() => NaN));
    if (sane(rate)) { g.__acc_usdt = { at: Date.now(), rate, source }; return g.__acc_usdt; }
  }
  // Keep the last live rate for up to a day before using the fixed fallback.
  const keep = c && Date.now() - c.at < 86_400_000 ? { ...c } : { rate: fallbackRate(), source: "env" };
  // Don't retry unreachable exchanges on every request: hold this answer for a minute.
  g.__acc_usdt = { ...keep, at: Date.now() - 4 * 60_000 };
  return keep;
}

/** Order total in Tether (2 decimals, rounded up). */
export const usdtOf = (toman: number, rate: number) => Math.ceil((toman / rate) * 100) / 100;

export async function startCrypto(code: string, totalToman: number): Promise<{ url: string; authority: string }> {
  if (!cryptoConfigured()) return { url: `/pay/test?order=${encodeURIComponent(code)}&m=crypto`, authority: `TEST-${code}-${Date.now()}` };
  const { rate } = await usdtRate();
  const r = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST", cache: "no-store",
    headers: { "content-type": "application/json", "x-api-key": process.env.NOWPAYMENTS_API_KEY! },
    body: JSON.stringify({
      price_amount: usdtOf(totalToman, rate), price_currency: "usd", // 1 USDT is priced as 1 USD order_id: code, order_description: `AccDrop order ${code}`,
      ipn_callback_url: `${siteUrl()}/api/pay/crypto`,
      success_url: `${siteUrl()}/orders/${code}?from=pay`, cancel_url: `${siteUrl()}/orders/${code}`,
    }),
  });
  const j = await r.json().catch(() => null);
  if (!j?.id || !j?.invoice_url) throw new Error(`nowpayments invoice failed: ${JSON.stringify(j)}`);
  return { url: j.invoice_url, authority: `NP-${j.id}` };
}

const sortDeep = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(sortDeep) : v && typeof v === "object"
    ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortDeep((v as Record<string, unknown>)[k])])) : v;

/** Checks the x-nowpayments-sig header (HMAC-SHA512 of the body with keys sorted). */
export function validIpn(raw: string, sig: string | null) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !sig) return false;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return false; }
  const want = createHmac("sha512", secret).update(JSON.stringify(sortDeep(parsed))).digest("hex");
  return want.length === sig.length && timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}
