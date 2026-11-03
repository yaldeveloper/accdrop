import type { OrderStatus } from "@/lib/account";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";
import { adminUpdateOrder, loadOrders } from "@/lib/server/orders";

const STATUSES: OrderStatus[] = ["pending", "paid", "activating", "active", "canceled", "refunded"];
type Ctx = { params: Promise<{ code: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => withAdmin(async () => {
  const [o] = await loadOrders({ code: decodeURIComponent((await ctx.params).code) });
  return o ? json({ order: o }) : fail("not_found", 404);
}));

export const PATCH = route(async (req: Request, ctx: Ctx) => withAdmin(async () => {
  const code = decodeURIComponent((await ctx.params).code);
  const b = await body<{ status: OrderStatus; note: string; secrets: Record<string, string> }>(req);
  if (b.status && !STATUSES.includes(b.status)) return fail("bad_status");
  if (!(await adminUpdateOrder(code, b))) return fail("not_found", 404);
  const [o] = await loadOrders({ code });
  return json({ order: o });
}));
