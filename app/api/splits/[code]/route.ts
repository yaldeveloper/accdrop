import { currentUser } from "@/lib/server/auth";
import { fail, json, route } from "@/lib/server/http";
import { viewSplit } from "@/lib/server/splits";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const u = await currentUser();
  const v = await viewSplit((await ctx.params).code, u?.mobile);
  return v ? json({ split: v }) : fail("not_found", 404);
});
