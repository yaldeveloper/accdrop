import { db } from "@/lib/server/db";
import { body, fail, json, route, withUser } from "@/lib/server/http";
import { completePayment } from "@/lib/server/orders";
import { gatewayConfigured } from "@/lib/server/pay";

// The built-in test gateway. Disabled as soon as a real Zarinpal merchant id is configured.
export const POST = route(async (req: Request) => withUser(async (u) => {
  if (gatewayConfigured()) return fail("disabled", 404);
  const { order, ok } = await body<{ order: string; ok: boolean }>(req);
  const sql = await db();
  const [o] = await sql`select authority from orders where code = ${order ?? ""} and mobile = ${u.mobile}`;
  if (!o?.authority) return fail("not_found", 404);
  const code = await completePayment(o.authority, !!ok);
  return json({ url: `/orders/${code}?from=pay` });
}));
