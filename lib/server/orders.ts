import { randomInt } from "node:crypto";
import { DELIVERY, MAX_SEATS, STATIC_IP, linePrice, productById, PRODUCTS, type DeliveryType } from "@/lib/catalog";
import { loadCatalog } from "./catalog";
import { normalizeUsername, validEmail, validUsername, type Order, type OrderLine, type OrderStatus } from "@/lib/account";
import { db } from "./db";
import { startPayment, verifyPayment } from "./pay";
import { sendOrderSms } from "./sms";

type Sql = Awaited<ReturnType<typeof db>>;
const ms = (d: Date | null) => (d ? new Date(d).getTime() : null);

export type LineInput = { id: string; plan: string; type: DeliveryType; email?: string; username?: string; seats?: number; ip?: string; members?: string[] };

/** Validates the cart and prices it from the catalog. Prices sent by the browser are ignored. */
export function priceLines(input: LineInput[]): { lines: OrderLine[] } | { error: string; index?: number } {
  if (!Array.isArray(input) || !input.length || input.length > 10) return { error: "bad_cart" };
  const lines: OrderLine[] = [];
  for (const [i, l] of input.entries()) {
    const p = PRODUCTS.find((x) => x.id === l?.id);
    if (!p || p.hidden || !(l.type in DELIVERY) || !p.plans[l.plan]?.[l.type]) return { error: "bad_item", index: i };
    const seats = p.group?.length ? Math.trunc(Number(l.seats ?? 1)) : 1;
    if (!(seats >= 1 && seats <= MAX_SEATS)) return { error: "bad_item", index: i };
    const ip = l.ip ? String(l.ip) : undefined;
    if (ip && (!p.ip || !STATIC_IP.countries[ip])) return { error: "bad_item", index: i };
    let members: string[] | undefined;
    if (seats > 1 && DELIVERY[l.type].input === "email") {
      members = (Array.isArray(l.members) ? l.members : []).map((m) => String(m).trim().toLowerCase()).slice(0, seats - 1);
      if (members.length !== seats - 1 || !members.every(validEmail)) return { error: "bad_members", index: i };
    }
    const need = DELIVERY[l.type].input;
    if (need === "email" && !validEmail(l.email ?? "")) return { error: "bad_email", index: i };
    if (need === "username" && !validUsername(l.username ?? "")) return { error: "bad_username", index: i };
    lines.push({
      id: p.id, plan: l.plan, type: l.type, seats, ip, members,
      price: linePrice({ id: p.id, plan: l.plan, type: l.type, seats, ip }),
      email: need === "email" ? l.email!.trim().toLowerCase() : undefined,
      username: need === "username" ? normalizeUsername(l.username!) : undefined,
    });
  }
  return { lines };
}

export async function discountRate(code: string): Promise<number> {
  const c = code.trim().toUpperCase();
  if (!c) return 0;
  const sql = await db();
  const [d] = await sql`select rate from discounts where code = ${c} and active and (max_uses is null or uses < max_uses)`;
  return d ? Number(d.rate) : 0;
}

export async function createOrder(mobile: string, input: LineInput[], discountCode: string) {
  await loadCatalog();
  const priced = priceLines(input);
  if ("error" in priced) return priced;
  const sql = await db();
  const code = discountCode.trim().toUpperCase();
  const rate = await discountRate(code);
  const subtotal = priced.lines.reduce((s, l) => s + l.price, 0);
  const discount = Math.round((subtotal * rate) / 1000) * 1000;
  const total = subtotal - discount;
  let orderCode = "";
  await sql.begin(async (tx) => {
    for (let tries = 0; ; tries++) {
      orderCode = `AD-${randomInt(100000, 1000000)}`;
      const r = await tx`
        insert into orders (code, mobile, status, subtotal, discount, total, discount_code)
        values (${orderCode}, ${mobile}, 'pending', ${subtotal}, ${discount}, ${total}, ${rate ? code : null})
        on conflict do nothing returning code`;
      if (r.length) break;
      if (tries > 5) throw new Error("could not allocate order code");
    }
    for (const [i, l] of priced.lines.entries()) {
      await tx`insert into order_lines (order_code, idx, product_id, plan, delivery, price, email, username, seats, ip, members)
        values (${orderCode}, ${i}, ${l.id}, ${l.plan}, ${l.type}, ${l.price}, ${l.email ?? null}, ${l.username ?? null},
          ${l.seats ?? 1}, ${l.ip ?? null}, ${l.members?.length ? l.members.join(",") : null})`;
    }
    const email = priced.lines.find((l) => l.email)?.email;
    if (email) await tx`update users set email = ${email} where mobile = ${mobile} and email = ''`;
  });
  return { code: orderCode, total };
}

/** Sends the customer to the gateway (or marks a free order paid). */
export async function payOrder(code: string, mobile: string): Promise<{ url: string } | { error: string }> {
  const sql = await db();
  const [o] = await sql`select status, total from orders where code = ${code} and mobile = ${mobile}`;
  if (!o) return { error: "not_found" };
  if (o.status !== "pending" && o.status !== "canceled") return { url: `/orders/${code}` };
  if (Number(o.total) === 0) { await markPaid(code, "FREE"); return { url: `/orders/${code}` }; }
  const p = await startPayment(code, Number(o.total), mobile);
  await sql`update orders set authority = ${p.authority}, status = 'pending' where code = ${code}`;
  return { url: p.url };
}

/** Gateway callback: verify, then mark paid and fulfil. Returns the order code to show. */
export async function completePayment(authority: string, okStatus: boolean): Promise<string | null> {
  const sql = await db();
  const [o] = await sql`select code, status, total from orders where authority = ${authority}`;
  if (!o) return null;
  if (o.status !== "pending") return o.code;
  if (!okStatus) { await sql`update orders set status = 'canceled' where code = ${o.code} and status = 'pending'`; return o.code; }
  const v = await verifyPayment(authority, Number(o.total));
  if (!v.ok) { await sql`update orders set status = 'canceled' where code = ${o.code} and status = 'pending'`; return o.code; }
  await markPaid(o.code, v.refId ?? "", v.cardPan);
  return o.code;
}

async function markPaid(code: string, refId: string, cardPan?: string) {
  const sql = await db();
  const r = await sql`update orders set status = 'paid', paid_at = now(), ref_id = ${refId}, card_pan = ${cardPan ?? null}
    where code = ${code} and status in ('pending', 'canceled') returning discount_code, mobile`;
  if (!r.length) return;
  if (r[0].discount_code) await sql`update discounts set uses = uses + 1 where code = ${r[0].discount_code}`;
  await fulfilInstant(sql, code);
}

/** Hands out gift codes from stock for every paid line that is waiting for one. Completes orders that need nothing else. */
export async function fulfilInstant(sql: Sql, onlyOrder?: string) {
  const waiting = await sql`
    select l.id, l.product_id, l.plan, l.order_code from order_lines l join orders o on o.code = l.order_code
    where o.status in ('paid', 'activating') and l.delivery = 'code' and l.secret is null
      ${onlyOrder ? sql`and o.code = ${onlyOrder}` : sql``}
    order by o.paid_at, l.idx`;
  const touched = new Set<string>(onlyOrder ? [onlyOrder] : []);
  for (const l of waiting) {
    await sql.begin(async (tx) => {
      const [c] = await tx`select id, code from gift_codes where product_id = ${l.product_id} and plan = ${l.plan} and line_id is null
        order by id limit 1 for update skip locked`;
      if (!c) return;
      await tx`update gift_codes set line_id = ${l.id}, used_at = now() where id = ${c.id}`;
      await tx`update order_lines set secret = ${c.code}, delivered_at = now() where id = ${l.id}`;
      touched.add(l.order_code);
    });
  }
  for (const code of touched) await completeIfDelivered(sql, code);
}

/** An order whose every line is an instant line that has been delivered becomes active on its own. */
async function completeIfDelivered(sql: Sql, code: string) {
  const lines = await sql`select delivery, secret from order_lines where order_code = ${code}`;
  const done = lines.every((l) => (l.delivery === "code" || l.delivery === "number") && l.secret);
  if (!done) return;
  const r = await sql`update orders set status = 'active', activated_at = now() where code = ${code} and status in ('paid', 'activating') returning mobile`;
  if (r.length) await sendOrderSms(r[0].mobile, code);
}

export async function loadOrders(where: { mobile?: string; code?: string; status?: string; q?: string; limit?: number }): Promise<Order[]> {
  const sql = await db();
  const q = where.q?.trim();
  const rows = await sql`
    select * from orders where true
      ${where.mobile ? sql`and mobile = ${where.mobile}` : sql``}
      ${where.code ? sql`and code = ${where.code}` : sql``}
      ${where.status ? (where.status === "open" ? sql`and status in ('paid', 'activating')` : sql`and status = ${where.status}`) : sql``}
      ${q ? sql`and (code ilike ${"%" + q + "%"} or mobile like ${"%" + q.replace(/\D/g, "") + "%"})` : sql``}
    order by created_at desc limit ${where.limit ?? 200}`;
  if (!rows.length) return [];
  const lines = await sql`select * from order_lines where order_code in ${sql(rows.map((r) => r.code))} order by idx`;
  return rows.map((o) => ({
    code: o.code, mobile: o.mobile, status: o.status as OrderStatus,
    createdAt: ms(o.created_at)!, paidAt: ms(o.paid_at), activatedAt: ms(o.activated_at),
    subtotal: Number(o.subtotal), discount: Number(o.discount), total: Number(o.total),
    refId: o.ref_id ?? undefined, adminNote: o.admin_note,
    lines: lines.filter((l) => l.order_code === o.code).map((l) => ({
      lineId: l.id, id: l.product_id, plan: l.plan, type: l.delivery as DeliveryType, price: Number(l.price),
      email: l.email ?? undefined, username: l.username ?? undefined,
      seats: Number(l.seats ?? 1), ip: l.ip ?? undefined, members: l.members ? String(l.members).split(",") : undefined, secret: l.secret ?? undefined, deliveredAt: ms(l.delivered_at),
    })),
  }));
}

/** Customers only see a line's secret (gift code, number, login) once it has been delivered and paid for. */
export const forCustomer = (o: Order): Order => ({
  ...o, adminNote: undefined,
  lines: o.lines.map((l) => ({ ...l, secret: o.status === "paid" || o.status === "activating" || o.status === "active" ? l.secret : undefined })),
});

// ----- Admin actions -----
export async function adminUpdateOrder(code: string, patch: { status?: OrderStatus; note?: string; secrets?: Record<string, string> }) {
  const sql = await db();
  const [o] = await sql`select status, mobile from orders where code = ${code}`;
  if (!o) return false;
  for (const [lineId, secret] of Object.entries(patch.secrets ?? {})) {
    const s = secret.trim();
    await sql`update order_lines set secret = ${s || null}, delivered_at = ${s ? sql`now()` : null}
      where id = ${Number(lineId)} and order_code = ${code}`;
  }
  if (patch.note !== undefined) await sql`update orders set admin_note = ${patch.note} where code = ${code}`;
  if (patch.status && patch.status !== o.status) {
    if (patch.status === "active") {
      await sql`update orders set status = 'active', activated_at = coalesce(activated_at, now()) where code = ${code}`;
      await sql`update order_lines set delivered_at = coalesce(delivered_at, now()) where order_code = ${code}`;
      await sendOrderSms(o.mobile, code);
    } else {
      await sql`update orders set status = ${patch.status} where code = ${code}`;
    }
  }
  return true;
}

export async function stockSummary() {
  const sql = await db();
  const rows = await sql`select product_id, plan, count(*) filter (where line_id is null)::int as free, count(*)::int as total
    from gift_codes group by product_id, plan`;
  const waiting = await sql`select l.product_id, l.plan, count(*)::int as n from order_lines l join orders o on o.code = l.order_code
    where o.status in ('paid', 'activating') and l.delivery = 'code' and l.secret is null group by l.product_id, l.plan`;
  return PRODUCTS.filter((p) => Object.values(p.plans).some((o) => o?.code)).flatMap((p) =>
    Object.keys(p.plans).filter((k) => p.plans[k]?.code).map((plan) => {
      const r = rows.find((x) => x.product_id === p.id && x.plan === plan);
      const w = waiting.find((x) => x.product_id === p.id && x.plan === plan);
      return { productId: p.id, plan, free: r?.free ?? 0, total: r?.total ?? 0, waiting: w?.n ?? 0 };
    }));
}

export async function addStock(productId: string, plan: string, codes: string[]) {
  const p = productById(productId);
  if (!p?.plans[plan]?.code) return { error: "bad_item" as const };
  const clean = [...new Set(codes.map((c) => c.trim()).filter((c) => c.length >= 4 && c.length <= 200))];
  if (!clean.length) return { added: 0, duplicates: 0 };
  const sql = await db();
  const r = await sql`insert into gift_codes ${sql(clean.map((code) => ({ product_id: productId, plan, code })))} on conflict (code) do nothing returning id`;
  await fulfilInstant(sql);
  return { added: r.length, duplicates: clean.length - r.length };
}
