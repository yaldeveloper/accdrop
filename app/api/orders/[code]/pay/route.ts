import { fail, json, route, withUser } from "@/lib/server/http";
import { asMethod, payOrder } from "@/lib/server/orders";
import { creditExpired } from "@/lib/server/gifts";

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => withUser(async (u) => {
  const { code } = await ctx.params;
  const m = new URL(req.url).searchParams.get("m");
  // Its AccDrop credit went to a newer order (or expired): the customer checks out again instead.
  if (await creditExpired(decodeURIComponent(code).toUpperCase())) return fail("credit_expired", 409);
  const p = await payOrder(decodeURIComponent(code).toUpperCase(), u.mobile, asMethod(m));
  return "error" in p ? fail(p.error, 404) : json({ payUrl: p.url });
}));
