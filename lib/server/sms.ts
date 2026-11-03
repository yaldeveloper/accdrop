// SMS through Kavenegar's verify/lookup API (templates are approved in the Kavenegar panel).
// Without KAVENEGAR_API_KEY the site runs in demo mode: no SMS is sent and the login code is always 12345.
export const smsConfigured = () => !!process.env.KAVENEGAR_API_KEY;

async function lookup(mobile: string, template: string, tokens: string[]) {
  const key = process.env.KAVENEGAR_API_KEY;
  if (!key) { console.log(`[sms demo] ${template} → ${mobile}: ${tokens.join(" ")}`); return true; }
  const q = new URLSearchParams({ receptor: mobile, template });
  tokens.slice(0, 3).forEach((t, i) => q.set(i ? `token${i + 1}` : "token", t.replace(/\s+/g, "-")));
  try {
    const r = await fetch(`https://api.kavenegar.com/v1/${key}/verify/lookup.json?${q}`, { cache: "no-store" });
    if (!r.ok) console.error("[sms] kavenegar", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("[sms] kavenegar", e);
    return false;
  }
}

export const sendOtpSms = (mobile: string, code: string) => lookup(mobile, process.env.KAVENEGAR_OTP_TEMPLATE || "accdrop-otp", [code]);

/** Order notifications are optional: set KAVENEGAR_ORDER_TEMPLATE to a template with %token (order code). */
export async function sendOrderSms(mobile: string, orderCode: string) {
  const t = process.env.KAVENEGAR_ORDER_TEMPLATE;
  if (t || !smsConfigured()) await lookup(mobile, t || "accdrop-order", [orderCode]);
}

/** Optional: SMS when support answers a ticket (template with %token = ticket number). */
export async function sendTicketSms(mobile: string, ticketId: number) {
  const t = process.env.KAVENEGAR_TICKET_TEMPLATE;
  if (t || !smsConfigured()) await lookup(mobile, t || "accdrop-ticket", [String(ticketId)]);
}

/** Optional: SMS to a «دنگ» organizer when the group is complete (template with %token = group code). */
export async function sendSplitSms(mobile: string, splitCode: string) {
  const t = process.env.KAVENEGAR_SPLIT_TEMPLATE;
  if (t || !smsConfigured()) await lookup(mobile, t || "accdrop-split", [splitCode]);
}
