import { body, fail, json, route, withUser } from "@/lib/server/http";
import { numberAction } from "@/lib/server/orders";

type Ctx = { params: Promise<{ code: string }> };
const ACTIONS = ["refresh", "cancel", "retry", "done"] as const;

async function act(code: string, line: unknown, action: unknown) {
  return withUser(async (u) => {
    const a = ACTIONS.find((x) => x === action) ?? "refresh";
    const r = await numberAction(decodeURIComponent(code).toUpperCase(), u.isAdmin ? null : u.mobile, Math.trunc(Number(line)), a);
    return "error" in r ? fail(r.error ?? "not_found", r.error === "not_found" ? 404 : 409) : json(r);
  });
}

/** Live virtual number of one order line: the number, codes received so far, and what the customer can do next. */
export const GET = route(async (req: Request, ctx: Ctx) => act((await ctx.params).code, new URL(req.url).searchParams.get("line"), "refresh"));

/** { line, action: "cancel" | "retry" | "done" } */
export const POST = route(async (req: Request, ctx: Ctx) => {
  const b = await body<{ line: number; action: string }>(req);
  return act((await ctx.params).code, b.line, b.action);
});
