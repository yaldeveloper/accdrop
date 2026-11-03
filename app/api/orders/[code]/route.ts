import { fail, json, route, withUser } from "@/lib/server/http";
import { forCustomer, loadOrders } from "@/lib/server/orders";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => withUser(async (u) => {
  const { code } = await ctx.params;
  const [o] = await loadOrders({ code: decodeURIComponent(code).toUpperCase(), mobile: u.isAdmin ? undefined : u.mobile });
  return o ? json({ order: forCustomer(o) }) : fail("not_found", 404);
}));
