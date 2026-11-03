import { fail, json, route, withUser } from "@/lib/server/http";
import { payOrder } from "@/lib/server/orders";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => withUser(async (u) => {
  const { code } = await ctx.params;
  const p = await payOrder(decodeURIComponent(code).toUpperCase(), u.mobile);
  return "error" in p ? fail(p.error, 404) : json({ payUrl: p.url });
}));
