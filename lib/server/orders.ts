import { randomInt } from "node:crypto";
import { DELIVERY, STATIC_IP, maxUnits, linePrice, productById, PRODUCTS, sellable, type DeliveryType } from "@/lib/catalog";
import { livePlan } from "@/lib/numbers";
import { loadCatalog } from "./catalog";
import { normalizeUsername, validEmail, validUsername, type Order, type OrderLine, type OrderStatus } from "@/lib/account";
import { db } from "./db";
import { gatewayConfigured, startPayment, verifyPayment } from "./pay";
import { cryptoConfigured, startCrypto } from "./crypto";
import { cancelBnpl, confirmBnpl } from "./bnpl";
import { onSplitPaid } from "./splits";
import { type LegalInfo, type PayMethod } from "@/lib/billing";
import { sendOrderSms } from "./sms";
import { firstOutOfStock, supplyLine } from "./supplier";
import { cancelNumber, finishNumber, fivesimConfigured, livePrice, publicNumber, refreshNumber, supplyNumber, type NumRecord } from "./fivesim";

type Sql = Awaited<ReturnType<typeof db>>;
const ms = (d: Date | null) => (d ? new Date(d).getTime() : null);

export type LineInput = { id: string; plan: string; type: DeliveryType; email?: string; username?: string; seats?: number; ip?: string; members?: string[] };

/** Validates the cart and prices it from the catalog. Prices sent by the browser are ignored.
 * `live` holds the server's current price of each live virtual number plan (from 5sim). */
export function priceLines(input: LineInput[], live: Record<string, number> = {}): { lines: OrderLine[] } | { error: string; index?: number } {
  if (!Array.isArray(input) || !input.length || input.length > 10) return { error: "bad_cart" };
  const lines: OrderLine[] = [];
  for (const [i, l] of input.entries()) {
    const p = PRODUCTS.find((x) => x.id === l?.id);
    if (!p || p.hidden || !(l.type in DELIVERY) || !sellable(p, l)) return { error: "bad_item", index: i };
    if (livePlan(l.plan) && !live[l.plan]) return { error: "number_unavailable", index: i };
    const seats = maxUnits(p) > 1 ? Math.trunc(Number(l.seats ?? 1)) : 1;
    if (!(seats >= 1 && seats <= maxUnits(p))) return { error: "bad_item", index: i };
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
      price: linePrice({ id: p.id, plan: l.plan, type: l.type, seats, ip, unit: live[l.plan] }),
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

export async function createOrder(mobile: string, input: LineInput[], discountCode: string,
  opts: { split?: { code: string; unit: number }; invoice?: LegalInfo | null } = {}) {
  await loadCatalog();
  const priced = priceLines(input, await livePrices(input));
  if ("error" in priced) return priced;
  const out = await firstOutOfStock(priced.lines);
  if (out >= 0) return { error: "out_of_stock", index: out };
  // A «دنگ» share is one seat at the group's locked per-person price.
  if (opts.split) priced.lines[0].price = opts.split.unit;
  const sql = await db();
  const code = opts.split ? "" : discountCode.trim().toUpperCase();
  const rate = await discountRate(code);
  const subtotal = priced.lines.reduce((s, l) => s + l.price, 0);
  const discount = Math.round((subtotal * rate) / 1000) * 1000;
  const total = subtotal - discount;
  let orderCode = "";
  await sql.begin(async (tx) => {
    for (let tries = 0; ; tries++) {
      orderCode = `AD-${randomInt(100000, 1000000)}`;
      const r = await tx`
        insert into orders (code, mobile, status, subtotal, discount, total, discount_code, split, invoice)
        values (${orderCode}, ${mobile}, 'pending', ${subtotal}, ${discount}, ${total}, ${rate ? code : null},
          ${opts.split?.code ?? null}, ${opts.invoice ? sql.json(opts.invoice) : null})
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

/** Today's price of every live virtual number in the cart (missing = out of stock or 5sim not connected). */
async function livePrices(input: LineInput[]): Promise<Record<string, number>> {
  const plans = [...new Set((Array.isArray(input) ? input : []).map((l) => String(l?.plan ?? "")).filter((x) => livePlan(x)))];
  if (!plans.length || !fivesimConfigured()) return {};
  const out: Record<string, number> = {};
  await Promise.all(plans.map(async (plan) => {
    const price = await livePrice(plan).catch((e) => { console.error(e); return null; });
    if (price) out[plan] = price;
  }));
  return out;
}

export type { PayMethod };
// Installments (SnappPay) are switched off for new orders; old "bnpl" orders still settle and refund through ./bnpl.
export const asMethod = (m: unknown): PayMethod => (m === "crypto" ? m : "card");

/** Sends the customer to the gateway (or marks a free order paid). */
export async function payOrder(code: string, mobile: string, method: PayMethod = "card"): Promise<{ url: string } | { error: string }> {
  const sql = await db();
  const [o] = await sql`select status, total, subtotal, discount from orders where code = ${code} and mobile = ${mobile}`;
  if (!o) return { error: "not_found" };
  if (o.status !== "pending" && o.status !== "canceled") return { url: `/orders/${code}` };
  if (Number(o.total) === 0) { await markPaid(code, "FREE"); return { url: `/orders/${code}` }; }
  if (method === "crypto" && !cryptoConfigured() && gatewayConfigured()) return { error: "crypto_unavailable" };
  const p = method === "crypto" ? await startCrypto(code, Number(o.total)) : await startPayment(code, Number(o.total), mobile);
  await sql`update orders set authority = ${p.authority}, status = 'pending', pay_method = ${method} where code = ${code}`;
  return { url: p.url };
}

/** SnappPay callback: state=OK → verify + settle → paid. Returns the order code to show. */
export async function completeBnpl(transactionId: string, state: string): Promise<string | null> {
  const sql = await db();
  const [o] = await sql`select code, status, pay_token from orders where authority = ${"SP-" + transactionId}`;
  if (!o) return null;
  if (o.status !== "pending") return o.code;
  const cancel = () => sql`update orders set status = 'canceled' where code = ${o.code} and status = 'pending'`;
  if (state.toUpperCase() !== "OK" || !o.pay_token) { await cancel(); return o.code; }
  if (!(await confirmBnpl(o.pay_token))) { await cancel(); return o.code; }
  await markPaid(o.code, transactionId, "snapppay");
  return o.code;
}

/** Gateway callback: verify, then mark paid and fulfil. Returns the order code to show. */
export async function completePayment(authority: string, okStatus: boolean): Promise<string | null> {
  const sql = await db();
  const [o] = await sql`select code, status, total from orders where authority = ${authority}`;
  if (!o) return null;
  if (o.status !== "pending") return o.code;
  if (!okStatus) { await sql`update orders set status = 'canceled' where code = ${o.code} and status = 'pending'`; return o.code; }
  // The test gateway stands in for both card and crypto while neither is configured.
  const v = authority.startsWith("TEST-") && !gatewayConfigured() ? { ok: true, refId: "TEST", cardPan: undefined } : await verifyPayment(authority, Number(o.total));
  if (!v.ok) { await sql`update orders set status = 'canceled' where code = ${o.code} and status = 'pending'`; return o.code; }
  await markPaid(o.code, v.refId ?? "", v.cardPan);
  return o.code;
}

async function markPaid(code: string, refId: string, cardPan?: string) {
  const sql = await db();
  const r = await sql`update orders set status = 'paid', paid_at = now(), ref_id = ${refId}, card_pan = ${cardPan ?? null}
    where code = ${code} and status in ('pending', 'canceled') returning discount_code, mobile, split`;
  if (!r.length) return;
  if (r[0].discount_code) await sql`update discounts set uses = uses + 1 where code = ${r[0].discount_code}`;
  if (r[0].split) await onSplitPaid(r[0].split);
  await fulfilInstant(sql, code);
}

/** Hands out gift codes from stock for every paid line that is waiting for one. Completes orders that need nothing else. */
export async function fulfilInstant(sql: Sql, onlyOrder?: string) {
  const waiting = await sql`
    select l.id, l.product_id, l.plan, l.order_code, l.seats from order_lines l join orders o on o.code = l.order_code
    where o.status in ('paid', 'activating') and l.delivery = 'code' and l.secret is null
      and (o.split is null or exists (select 1 from splits s where s.code = o.split and s.status in ('full', 'closed')))
      ${onlyOrder ? sql`and o.code = ${onlyOrder}` : sql``}
    order by o.paid_at, l.idx`;
  const touched = new Set<string>(onlyOrder ? [onlyOrder] : []);
  for (const l of waiting) {
    // One code per unit: a group line gets one per seat, a wholesale line one per account bought.
    const need = Math.max(1, Number(l.seats ?? 1));
    await sql.begin(async (tx) => {
      const cs = await tx`select id, code from gift_codes where product_id = ${l.product_id} and plan = ${l.plan} and line_id is null
        order by id limit ${need} for update skip locked`;
      if (cs.length < need) return;
      await tx`update gift_codes set line_id = ${l.id}, used_at = now() where id in ${tx(cs.map((c) => c.id))}`;
      await tx`update order_lines set secret = ${cs.map((c) => c.code).join("\n")}, delivered_at = now() where id = ${l.id}`;
      touched.add(l.order_code);
    });
    if (touched.has(l.order_code) && (await sql`select 1 from order_lines where id = ${l.id} and secret is not null`).length) continue;
    // Our own stock can't cover the line: buy the codes from the supplier, if this product/plan is connected to one.
    const codes = await supplyLine(l.id, l.product_id, l.plan, need);
    if (codes?.length) {
      const r = await sql`update order_lines set secret = ${codes.join("\n")}, delivered_at = now() where id = ${l.id} and secret is null returning id`;
      if (r.length) touched.add(l.order_code);
    }
  }
  // Live virtual numbers: buy one from 5sim for every paid line that has none yet.
  const numbers = await sql`
    select l.id, l.plan, l.price, l.order_code from order_lines l join orders o on o.code = l.order_code
    where o.status in ('paid', 'activating') and l.delivery = 'number' and l.num is null and l.plan like '5s:%'
      ${onlyOrder ? sql`and o.code = ${onlyOrder}` : sql``}
    order by o.paid_at, l.idx`;
  for (const l of numbers) await supplyNumber(l.id, l.plan, Number(l.price));
  for (const code of touched) await completeIfDelivered(sql, code);
}

/** An order whose every line is an instant line that has been delivered becomes active on its own. */
async function completeIfDelivered(sql: Sql, code: string) {
  const lines = await sql`select delivery, plan, secret, num from order_lines where order_code = ${code}`;
  // A live number is delivered once its verification code has arrived.
  const done = lines.every((l) => (l.delivery === "code" || l.delivery === "number") && l.secret
    && (!livePlan(l.plan) || ((l.num as NumRecord | null)?.codes ?? []).length > 0));
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
  const splitCodes = [...new Set(rows.map((r) => r.split).filter(Boolean))] as string[];
  const splits = splitCodes.length ? await sql`
    select s.code, s.seats, s.status, (select count(*)::int from orders x where x.split = s.code and x.status in ('paid', 'activating', 'active')) as paid
    from splits s where s.code in ${sql(splitCodes)}` : [];
  return rows.map((o) => ({
    code: o.code, mobile: o.mobile, status: o.status as OrderStatus,
    createdAt: ms(o.created_at)!, paidAt: ms(o.paid_at), activatedAt: ms(o.activated_at),
    subtotal: Number(o.subtotal), discount: Number(o.discount), total: Number(o.total),
    refId: o.ref_id ?? undefined, adminNote: o.admin_note, payMethod: o.pay_method,
    split: o.split ? (({ code, seats, status, paid }) => ({ code, seats: Number(seats), status, paid: Number(paid) }))(splits.find((x) => x.code === o.split) ?? { code: o.split, seats: 0, status: "open", paid: 0 }) : null,
    invoice: o.invoice ?? null, taxId: o.tax_id || undefined,
    lines: lines.filter((l) => l.order_code === o.code).map((l) => ({
      lineId: l.id, id: l.product_id, plan: l.plan, type: l.delivery as DeliveryType, price: Number(l.price),
      email: l.email ?? undefined, username: l.username ?? undefined,
      seats: Number(l.seats ?? 1), ip: l.ip ?? undefined, members: l.members ? String(l.members).split(",") : undefined, secret: l.secret ?? undefined, deliveredAt: ms(l.delivered_at),
      supplyRef: l.supply_ref ?? undefined,
      number: livePlan(l.plan) ? publicNumber(l.num as NumRecord | null) ?? { status: "BUYING", codes: [], tries: 0 } : undefined,
    })),
  }));
}

/** Customers only see a line's secret (gift code, number, login) once it has been delivered and paid for. */
export const forCustomer = (o: Order): Order => ({
  ...o, adminNote: undefined,
  lines: o.lines.map((l) => {
    const show = o.status === "paid" || o.status === "activating" || o.status === "active";
    return { ...l, supplyRef: undefined, secret: show ? l.secret : undefined, number: show ? l.number : undefined };
  }),
});

/**
 * Customer actions on a live virtual number line: refresh (fetch new SMS), cancel (no code yet), retry (new number after
 * one that got no code), done (close it after the code arrived). Returns the line's number state.
 */
export async function numberAction(code: string, mobile: string | null, lineId: number, action: "refresh" | "cancel" | "retry" | "done") {
  const sql = await db();
  const [l] = await sql`select l.id, l.plan, l.price, o.status from order_lines l join orders o on o.code = l.order_code
    where l.id = ${lineId} and o.code = ${code} ${mobile ? sql`and o.mobile = ${mobile}` : sql``}`;
  if (!l || !livePlan(l.plan)) return { error: "not_found" as const };
  if (!["paid", "activating", "active"].includes(l.status)) return { error: "not_paid" as const };
  let n: NumRecord | null;
  if (action === "cancel") n = await cancelNumber(l.id);
  else if (action === "retry") {
    n = await refreshNumber(l.id);
    if (publicNumber(n)?.canRetry) await supplyNumber(l.id, l.plan, Number(l.price), true);
    n = await refreshNumber(l.id);
  } else if (action === "done") { await finishNumber(l.id); n = await refreshNumber(l.id); }
  else {
    // A paid line that has no number yet (e.g. 5sim was busy right after payment) gets one now.
    if (!(await sql`select 1 from order_lines where id = ${l.id} and num is not null`).length) await supplyNumber(l.id, l.plan, Number(l.price));
    n = await refreshNumber(l.id);
  }
  if (n?.codes?.length) await completeIfDelivered(sql, code);
  return { number: publicNumber(n) };
}

// ----- Admin actions -----
export async function adminUpdateOrder(code: string, patch: { status?: OrderStatus; note?: string; secrets?: Record<string, string>; taxId?: string }) {
  const sql = await db();
  const [o] = await sql`select status, mobile, pay_method, pay_token from orders where code = ${code}`;
  if (!o) return false;
  for (const [lineId, secret] of Object.entries(patch.secrets ?? {})) {
    const s = secret.trim();
    await sql`update order_lines set secret = ${s || null}, delivered_at = ${s ? sql`now()` : null}
      where id = ${Number(lineId)} and order_code = ${code}`;
  }
  if (patch.note !== undefined) await sql`update orders set admin_note = ${patch.note} where code = ${code}`;
  if (patch.taxId !== undefined) await sql`update orders set tax_id = ${String(patch.taxId).trim().slice(0, 40)} where code = ${code}`;
  // Refunding an installment purchase also cancels it at SnappPay, so the customer's remaining parts are dropped.
  if (patch.status === "refunded" && o.status !== "refunded" && o.pay_method === "bnpl") await cancelBnpl(o.pay_token ?? "");
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
  const clean = [...new Set(codes.map((c) => c.trim()).filter((c) => c.length >= 4 && c.length <= 500))];
  if (!clean.length) return { added: 0, duplicates: 0 };
  const sql = await db();
  const r = await sql`insert into gift_codes ${sql(clean.map((code) => ({ product_id: productId, plan, code })))} on conflict (code) do nothing returning id`;
  await fulfilInstant(sql);
  return { added: r.length, duplicates: clean.length - r.length };
}

/** NOWPayments callback (signature already checked): marks the order paid or canceled. */
export async function completeCrypto(orderCode: string, status: string, paymentId: string) {
  const sql = await db();
  const [o] = await sql`select code, status, authority from orders where code = ${orderCode}`;
  if (!o || !String(o.authority ?? "").startsWith("NP-")) return;
  if (status === "finished" || status === "confirmed") await markPaid(o.code, `NP-${paymentId}`, "crypto");
  else if ((status === "failed" || status === "expired") && o.status === "pending") await sql`update orders set status = 'canceled' where code = ${o.code}`;
}
