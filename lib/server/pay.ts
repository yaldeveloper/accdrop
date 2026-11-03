// Zarinpal (v4 REST). Set ZARINPAL_MERCHANT to go live; ZARINPAL_SANDBOX=1 uses the sandbox.
// Without a merchant id the site uses a built-in test gateway (/pay/test) so the whole flow can be tried.
const base = () => (process.env.ZARINPAL_SANDBOX === "1" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com");
export const gatewayConfigured = () => !!process.env.ZARINPAL_MERCHANT;

export const siteUrl = () => (process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");

/** Starts a payment. Returns the URL to send the customer to, and the gateway's authority id. */
export async function startPayment(code: string, totalToman: number, mobile: string): Promise<{ url: string; authority: string }> {
  if (!gatewayConfigured()) return { url: `/pay/test?order=${encodeURIComponent(code)}`, authority: `TEST-${code}-${Date.now()}` };
  const r = await fetch(`${base()}/pg/v4/payment/request.json`, {
    method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, cache: "no-store",
    body: JSON.stringify({
      merchant_id: process.env.ZARINPAL_MERCHANT,
      amount: totalToman * 10, // Rial
      description: `سفارش ${code} اک‌دراپ`,
      callback_url: `${siteUrl()}/api/pay/callback`,
      metadata: { mobile, order_id: code },
    }),
  });
  const j = await r.json().catch(() => null);
  const authority = j?.data?.authority;
  if (j?.data?.code !== 100 || !authority) throw new Error(`zarinpal request failed: ${JSON.stringify(j?.errors ?? j)}`);
  return { url: `${base()}/pg/StartPay/${authority}`, authority };
}

/** Confirms a payment with the gateway. Code 101 means it was already verified, which also counts as paid. */
export async function verifyPayment(authority: string, totalToman: number): Promise<{ ok: boolean; refId?: string; cardPan?: string }> {
  if (!gatewayConfigured()) return { ok: authority.startsWith("TEST-"), refId: "TEST" };
  const r = await fetch(`${base()}/pg/v4/payment/verify.json`, {
    method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, cache: "no-store",
    body: JSON.stringify({ merchant_id: process.env.ZARINPAL_MERCHANT, amount: totalToman * 10, authority }),
  });
  const j = await r.json().catch(() => null);
  const c = j?.data?.code;
  return c === 100 || c === 101 ? { ok: true, refId: String(j.data.ref_id), cardPan: j.data.card_pan } : { ok: false };
}
