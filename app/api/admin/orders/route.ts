import { json, route, withAdmin } from "@/lib/server/http";
import { loadOrders } from "@/lib/server/orders";

export const GET = route(async (req: Request) => withAdmin(async () => {
  const u = new URL(req.url).searchParams;
  return json({ orders: await loadOrders({ status: u.get("status") || undefined, q: u.get("q") || undefined, limit: 300 }) });
}));
