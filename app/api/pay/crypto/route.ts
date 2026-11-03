import { completeCrypto } from "@/lib/server/orders";
import { validIpn } from "@/lib/server/crypto";
import { fail, json, route } from "@/lib/server/http";

/** NOWPayments IPN. */
export const POST = route(async (req: Request) => {
  const raw = await req.text();
  if (!validIpn(raw, req.headers.get("x-nowpayments-sig"))) return fail("bad_signature", 401);
  const b = JSON.parse(raw) as { order_id?: string; payment_status?: string; payment_id?: string | number };
  if (b.order_id && b.payment_status) await completeCrypto(String(b.order_id), b.payment_status, String(b.payment_id ?? ""));
  return json({ ok: true });
});
