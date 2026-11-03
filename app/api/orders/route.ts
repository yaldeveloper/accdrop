import { body, fail, json, route, withUser } from "@/lib/server/http";
import { asMethod, createOrder, forCustomer, loadOrders, payOrder, type LineInput } from "@/lib/server/orders";
import { saveLegal } from "@/lib/server/legal";

export const GET = route(async () => withUser(async (u) => json({ orders: (await loadOrders({ mobile: u.mobile })).map(forCustomer) })));

export const POST = route(async (req: Request) => withUser(async (u) => {
  const { lines, discount, method, invoice } = await body<{ lines: LineInput[]; discount: string; method: string; invoice: unknown }>(req);
  // Official invoice requested: validate and remember the buyer's legal details before creating the order.
  let legal = null;
  if (invoice) {
    const c = await saveLegal(u.mobile, invoice);
    if ("error" in c) return fail("bad_legal", 400, { field: c.error });
    legal = c.info;
  }
  const r = await createOrder(u.mobile, lines ?? [], String(discount ?? ""), { invoice: legal });
  if ("error" in r) return fail(r.error, 400, { index: r.index });
  const p = await payOrder(r.code, u.mobile, asMethod(method));
  return "error" in p ? fail(p.error) : json({ code: r.code, payUrl: p.url });
}));
