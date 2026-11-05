import { fail, json, route, withUser } from "@/lib/server/http";
import { redeemGift } from "@/lib/server/gifts";

/** Adds the gift to the signed-in customer's AccDrop credit. */
export const POST = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => withUser(async (u) => {
  const { code } = await ctx.params;
  const r = await redeemGift(code, u.mobile);
  return "error" in r ? fail(r.error, r.error === "not_found" ? 404 : 409) : json(r);
}));
