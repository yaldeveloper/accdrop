import { json, route, withAdmin } from "@/lib/server/http";
import { listTickets } from "@/lib/server/tickets";

export const GET = route(async (req: Request) => withAdmin(async () => {
  const u = new URL(req.url).searchParams;
  return json({ tickets: await listTickets({ status: u.get("status") || undefined, q: u.get("q") || undefined }) });
}));
