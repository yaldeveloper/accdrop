import { body, fail, json, route, withUser } from "@/lib/server/http";
import { asMethod } from "@/lib/server/orders";
import { joinSplit } from "@/lib/server/splits";

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => withUser(async (u) => {
  const b = await body<{ email: string; username: string; method: string }>(req);
  const r = await joinSplit((await ctx.params).code, u.mobile, { email: b.email, username: b.username, method: asMethod(b.method) });
  return "error" in r ? fail(r.error as string) : json({ payUrl: r.url });
}));
