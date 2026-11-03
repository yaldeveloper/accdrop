import { fail, json, route, withUser } from "@/lib/server/http";
import { closeSplit } from "@/lib/server/splits";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => withUser(async (u) => {
  const r = await closeSplit((await ctx.params).code, u.mobile);
  return "error" in r ? fail(r.error as string) : json(r);
}));
