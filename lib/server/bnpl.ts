// Pay later in installments with SnappPay (اسنپ‌پی). Needs a merchant contract with SnappPay; they provide the values for
// SNAPPPAY_BASE_URL, SNAPPPAY_CLIENT_ID, SNAPPPAY_CLIENT_SECRET, SNAPPPAY_USERNAME and SNAPPPAY_PASSWORD.
// Flow: OAuth token → eligible(amount) → payment token (customer goes to paymentPageUrl) → callback (POST, state=OK)
// → verify → settle. Amounts are in Rial. Without credentials, orders go through the built-in test gateway.
import { siteUrl } from "./pay";

const env = (k: string) => process.env[k] ?? "";
export const bnplConfigured = () => !!(env("SNAPPPAY_BASE_URL") && env("SNAPPPAY_CLIENT_ID") && env("SNAPPPAY_USERNAME"));
const base = () => env("SNAPPPAY_BASE_URL").replace(/\/$/, "");
const g = globalThis as unknown as { __acc_snapp?: { token: string; until: number } };

async function call(path: string, init: RequestInit & { auth?: boolean } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.auth !== false) headers.set("authorization", `Bearer ${await token()}`);
    const r = await fetch(base() + path, { ...init, headers, cache: "no-store", signal: ctl.signal });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`snapppay ${path} ${r.status}: ${JSON.stringify(j)?.slice(0, 300)}`);
    return j as Record<string, unknown> & { response?: Record<string, unknown>; successful?: boolean };
  } finally { clearTimeout(t); }
}

async function token() {
  const c = g.__acc_snapp;
  if (c && c.until > Date.now()) return c.token;
  const basic = Buffer.from(`${env("SNAPPPAY_CLIENT_ID")}:${env("SNAPPPAY_CLIENT_SECRET")}`).toString("base64");
  const j = await call("/api/online/v1/oauth/token", {
    method: "POST", auth: false,
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "password", scope: "online-merchant", username: env("SNAPPPAY_USERNAME"), password: env("SNAPPPAY_PASSWORD") }),
  });
  const tok = String(j.access_token ?? "");
  if (!tok) throw new Error("snapppay: no access token");
  g.__acc_snapp = { token: tok, until: Date.now() + Math.max(60, Number(j.expires_in ?? 600) - 60) * 1000 };
  return tok;
}

/** Field from the top level or from `response` (SnappPay wraps results in { successful, response }). */
const pick = (j: Record<string, unknown> & { response?: Record<string, unknown> }, k: string) => j?.[k] ?? j?.response?.[k];
const ok = (j: Record<string, unknown> & { response?: Record<string, unknown> }) => j?.successful !== false && pick(j, "successful") !== false;

const e164 = (mobile: string) => `+98${mobile.replace(/^0/, "")}`;

export type BnplItem = { id: string; name: string; amount: number };

/** Starts an installment payment. Totals are in Toman. */
export async function startBnpl(code: string, subtotal: number, discount: number, mobile: string, items: BnplItem[]): Promise<{ url: string; authority: string; token?: string }> {
  if (!bnplConfigured()) return { url: `/pay/test?order=${encodeURIComponent(code)}&m=bnpl`, authority: `TEST-${code}-${Date.now()}` };
  const rial = (t: number) => Math.round(t * 10);
  const el = await call(`/api/online/offer/v1/eligible?amount=${rial(subtotal - discount)}`);
  if (pick(el, "eligible") === false) throw new Error("bnpl_not_eligible");
  const transactionId = `${code}-${Date.now().toString(36)}`;
  const j = await call("/api/online/payment/v1/token", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      amount: rial(subtotal), discountAmount: rial(discount), externalSourceAmount: 0,
      mobile: e164(mobile), returnURL: `${siteUrl()}/api/pay/snapp`, transactionId,
      cartList: [{
        cartId: code, totalAmount: rial(subtotal), shippingAmount: 0, isShipmentIncluded: false, taxAmount: 0, isTaxIncluded: true,
        cartItems: items.map((it) => ({ id: it.id, name: it.name, count: 1, amount: rial(it.amount), category: "اشتراک دیجیتال", commissionType: 100 })),
      }],
    }),
  });
  const paymentToken = String(pick(j, "paymentToken") ?? ""), url = String(pick(j, "paymentPageUrl") ?? "");
  if (!paymentToken || !url) throw new Error(`snapppay token failed: ${JSON.stringify(j).slice(0, 300)}`);
  return { url, authority: `SP-${transactionId}`, token: paymentToken };
}

const post = (path: string, paymentToken: string) =>
  call(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentToken }) });

/** Verify then settle. Both must succeed before the order counts as paid. */
export async function confirmBnpl(paymentToken: string): Promise<boolean> {
  try {
    if (!ok(await post("/api/online/payment/v1/verify", paymentToken))) return false;
    return ok(await post("/api/online/payment/v1/settle", paymentToken));
  } catch (e) {
    console.error(e);
    return false;
  }
}

/** Cancels a settled installment purchase (used when an order is refunded). */
export async function cancelBnpl(paymentToken: string) {
  if (!bnplConfigured() || !paymentToken) return false;
  try { return ok(await post("/api/online/payment/v1/cancel", paymentToken)); } catch (e) { console.error(e); return false; }
}
