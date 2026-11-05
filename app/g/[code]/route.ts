import { NextResponse } from "next/server";
import { giftPath } from "@/lib/gift";

/** Short link used in the gift SMS: accdrop.ir/g/<code>. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return NextResponse.redirect(new URL(giftPath(code), req.url), 307);
}
