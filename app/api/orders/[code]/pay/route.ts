import { fail, json, route, withUser } from "@/lib/server/http";
import { asMethod, payOrder } from "@/lib/server/orders";

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => withUser(async (u) => {
  const { code } = await ctx.params;
  const m = new URL(req.url).searchParams.get("m");
  const p = await payOrder(decodeURIComponent(code).toUpperCase(), u.mobile, asMethod(m));
  return "error" in p ? fail(p.error, 404) : json({ payUrl: p.url });
}));
