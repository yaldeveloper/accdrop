import { body, fail, json, route, withAdmin } from "@/lib/server/http";
import { addStock, stockSummary } from "@/lib/server/orders";

export const GET = route(async () => withAdmin(async () => json({ stock: await stockSummary() })));

export const POST = route(async (req: Request) => withAdmin(async () => {
  const b = await body<{ productId: string; plan: string; codes: string }>(req);
  const r = await addStock(String(b.productId ?? ""), String(b.plan ?? ""), String(b.codes ?? "").split(/[\n,]+/));
  if ("error" in r) return fail(r.error ?? "bad_item");
  return json({ ...r, stock: await stockSummary() });
}));
