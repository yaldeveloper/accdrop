import { body, fail, json, route, withUser } from "@/lib/server/http";
import { createTicket, listTickets } from "@/lib/server/tickets";

export const GET = route(async () => withUser(async (u) => json({ tickets: await listTickets({ mobile: u.mobile }) })));

export const POST = route(async (req: Request) => withUser(async (u) => {
  const r = await createTicket(u.mobile, await body<{ topic: string; subject: string; orderCode: string; body: string }>(req));
  return "error" in r ? fail(r.error!) : json(r);
}));
