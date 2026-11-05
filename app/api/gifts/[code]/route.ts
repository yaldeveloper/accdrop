import { currentUser } from "@/lib/server/auth";
import { fail, json, route } from "@/lib/server/http";
import { viewGift } from "@/lib/server/gifts";

/** The gift behind a link. Public: the code itself is the secret. */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = await ctx.params;
  const u = await currentUser();
  const gift = await viewGift(code, u?.mobile ?? null);
  return gift ? json({ gift }) : fail("not_found", 404);
});
