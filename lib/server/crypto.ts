// Crypto payments through NOWPayments (USDT and other coins; the customer picks the coin on the invoice page).
// Set NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET to go live, and CRYPTO_RATE_TOMAN to the Toman price of one dollar.
// Without an API key, crypto orders go through the built-in test gateway like card orders do.
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "./pay";

export const cryptoConfigured = () => !!process.env.NOWPAYMENTS_API_KEY;
export const tomanPerUsd = () => Math.max(1000, Number(process.env.CRYPTO_RATE_TOMAN) || 105000);
export const usdOf = (toman: number) => Math.ceil((toman / tomanPerUsd()) * 100) / 100;

export async function startCrypto(code: string, totalToman: number): Promise<{ url: string; authority: string }> {
  if (!cryptoConfigured()) return { url: `/pay/test?order=${encodeURIComponent(code)}&m=crypto`, authority: `TEST-${code}-${Date.now()}` };
  const r = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST", cache: "no-store",
    headers: { "content-type": "application/json", "x-api-key": process.env.NOWPAYMENTS_API_KEY! },
    body: JSON.stringify({
      price_amount: usdOf(totalToman), price_currency: "usd", order_id: code, order_description: `AccDrop order ${code}`,
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
