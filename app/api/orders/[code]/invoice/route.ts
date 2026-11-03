import { body, fail, json, route, withUser } from "@/lib/server/http";
import { db } from "@/lib/server/db";
import { forCustomer, loadOrders } from "@/lib/server/orders";
import { saveLegal, seller, vatPercent } from "@/lib/server/legal";
import { isPaid } from "@/lib/account";

type Ctx = { params: Promise<{ code: string }> };
const codeOf = async (ctx: Ctx) => decodeURIComponent((await ctx.params).code).toUpperCase();

/** Invoice data for a paid order: the order, buyer and seller details, VAT rate. */
export const GET = route(async (_req: Request, ctx: Ctx) => withUser(async (u) => {
  const [o] = await loadOrders({ code: await codeOf(ctx), mobile: u.isAdmin ? undefined : u.mobile });
  if (!o || !isPaid(o)) return fail("not_found", 404);
  const sql = await db();
  const [buyer] = await sql`select name from users where mobile = ${o.mobile}`;
  return json({ order: forCustomer(o), seller: seller(), vat: vatPercent(), buyerName: buyer?.name ?? "" });
}));

/** Adds (or corrects) official-invoice buyer details after purchase, until the invoice is registered with the tax system. */
export const POST = route(async (req: Request, ctx: Ctx) => withUser(async (u) => {
  const code = await codeOf(ctx);
  const [o] = await loadOrders({ code, mobile: u.mobile });
  if (!o || !isPaid(o)) return fail("not_found", 404);
  if (o.taxId) return fail("locked", 409);
  const r = await saveLegal(u.mobile, await body(req));
  if ("error" in r) return fail("bad_field", 400, { field: r.error });
  const sql = await db();
  await sql`update orders set invoice = ${sql.json(r.info)} where code = ${code}`;
  return json({ invoice: r.info });
}));
