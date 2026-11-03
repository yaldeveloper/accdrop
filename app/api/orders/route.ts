import { body, fail, json, route, withUser } from "@/lib/server/http";
import { createOrder, forCustomer, loadOrders, payOrder, type LineInput } from "@/lib/server/orders";

export const GET = route(async () => withUser(async (u) => json({ orders: (await loadOrders({ mobile: u.mobile })).map(forCustomer) })));

export const POST = route(async (req: Request) => withUser(async (u) => {
  const { lines, discount, method } = await body<{ lines: LineInput[]; discount: string; method: string }>(req);
  const r = await createOrder(u.mobile, lines ?? [], String(discount ?? ""));
  if ("error" in r) return fail(r.error, 400, { index: r.index });
  const p = await payOrder(r.code, u.mobile, method === "crypto" ? "crypto" : "card");
  return "error" in p ? fail(p.error) : json({ code: r.code, payUrl: p.url });
}));
