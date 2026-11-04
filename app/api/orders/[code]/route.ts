import { fail, json, route, withUser } from "@/lib/server/http";
import { db } from "@/lib/server/db";
import { forCustomer, fulfilInstant, loadOrders } from "@/lib/server/orders";

const lastCheck = new Map<string, number>();

export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => withUser(async (u) => {
  const { code } = await ctx.params;
  const where = { code: decodeURIComponent(code).toUpperCase(), mobile: u.isAdmin ? undefined : u.mobile };
  let [o] = await loadOrders(where);
  if (!o) return fail("not_found", 404);
  // A paid line still waiting for its code (e.g. a supplier order in flight): check on it while the customer watches.
  const due = Date.now() - (lastCheck.get(o.code) ?? 0) > 20_000;
  if (due && (o.status === "paid" || o.status === "activating") && o.lines.some((l) => l.type === "code" && !l.secret)) {
    lastCheck.set(o.code, Date.now());
    await fulfilInstant(await db(), o.code).catch((e) => console.error(e));
    [o] = await loadOrders(where);
  }
  return json({ order: forCustomer(o) });
}));
