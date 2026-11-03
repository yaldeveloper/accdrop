import { body, fail, json, route, withUser } from "@/lib/server/http";
import { addMessage, getTicket, setTicketStatus } from "@/lib/server/tickets";

type Ctx = { params: Promise<{ id: string }> };
const idOf = async (ctx: Ctx) => Number((await ctx.params).id) || 0;

export const GET = route(async (_req: Request, ctx: Ctx) => withUser(async (u) => {
  const t = await getTicket(await idOf(ctx), u.mobile);
  return t ? json({ ticket: t }) : fail("not_found", 404);
}));

export const POST = route(async (req: Request, ctx: Ctx) => withUser(async (u) => {
  const id = await idOf(ctx);
  const r = await addMessage(id, "user", (await body<{ body: string }>(req)).body, u.mobile);
  return "error" in r ? fail(r.error!, r.error === "not_found" ? 404 : 400) : json({ ticket: await getTicket(id, u.mobile) });
}));

export const PATCH = route(async (_req: Request, ctx: Ctx) => withUser(async (u) => {
  const id = await idOf(ctx);
  return (await setTicketStatus(id, "closed", u.mobile)) ? json({ ticket: await getTicket(id, u.mobile) }) : fail("not_found", 404);
}));
