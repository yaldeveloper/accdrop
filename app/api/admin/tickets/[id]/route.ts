import type { TicketStatus } from "@/lib/tickets";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";
import { addMessage, getTicket, setTicketStatus } from "@/lib/server/tickets";

type Ctx = { params: Promise<{ id: string }> };
const idOf = async (ctx: Ctx) => Number((await ctx.params).id) || 0;

export const GET = route(async (_req: Request, ctx: Ctx) => withAdmin(async () => {
  const t = await getTicket(await idOf(ctx));
  return t ? json({ ticket: t }) : fail("not_found", 404);
}));

export const POST = route(async (req: Request, ctx: Ctx) => withAdmin(async () => {
  const id = await idOf(ctx);
  const r = await addMessage(id, "admin", (await body<{ body: string }>(req)).body);
  return "error" in r ? fail(r.error!, r.error === "not_found" ? 404 : 400) : json({ ticket: await getTicket(id) });
}));

export const PATCH = route(async (req: Request, ctx: Ctx) => withAdmin(async () => {
  const id = await idOf(ctx);
  const { status } = await body<{ status: TicketStatus }>(req);
  if (!status || !["open", "answered", "closed"].includes(status)) return fail("bad_status");
  return (await setTicketStatus(id, status)) ? json({ ticket: await getTicket(id) }) : fail("not_found", 404);
}));
