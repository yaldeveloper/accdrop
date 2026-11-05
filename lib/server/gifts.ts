// AccDrop gift cards and store credit.
//
// A gift card is an ordinary order with one line of the hidden product GIFT_ID (lib/gift.ts), so it is paid, listed and
// refunded like every other order. Its extra details (design, names, note, recipient mobile, delivery time) live in
// `gifts`. Once the order is paid, the supplier hook (supplyLine in ./supplier) hands out the gift code as the line's
// secret, and the recipient gets an SMS with the link right away or at the chosen time.
//
// Credit: `credit_ledger` holds what was added to a customer (redeemed gifts, admin corrections). What was spent is
// read from the orders themselves (`orders.credit`), so a refunded order gives its credit back on its own:
//   balance = Σ ledger − Σ credit of paid orders − credit held by the customer's latest unpaid order (for 24 hours).
import { randomInt } from "node:crypto";
import { after } from "next/server";
import { GIFT_AMOUNTS, GIFT_ID, GIFT_LIMITS, cleanCode, themeById, type CreditEntry, type GiftView, type SentGift } from "@/lib/gift";
import { normalizeMobile, validMobile } from "@/lib/account";
import { db, dbUrl } from "./db";
import { lookup, smsConfigured } from "./sms";

type Sql = Awaited<ReturnType<typeof db>>;
const ms = (d: Date | null) => (d ? new Date(d).getTime() : null);
const g = globalThis as unknown as { __acc_gift_schema?: Promise<void>; __acc_gift_kick?: number };

const SCHEMA = `
create table if not exists gifts (
  code text primary key,
  order_code text not null unique references orders(code) on delete cascade,
  amount bigint not null,
  theme text not null default 'drop',
  from_name text not null default '',
  to_name text not null default '',
  to_mobile text,
  message text not null default '',
  send_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  redeemed_by text references users(mobile),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists gifts_due on gifts(send_at) where sent_at is null and to_mobile is not null;
create table if not exists credit_ledger (
  id serial primary key,
  mobile text not null references users(mobile),
  amount bigint not null,
  reason text not null,
  ref text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_mobile on credit_ledger(mobile);
alter table orders add column if not exists credit bigint not null default 0;
`;

/** The SQL client, after making sure the gift tables exist (kept apart from ./db so it can be added without a migration). */
export async function giftDb(): Promise<Sql> {
  const sql = await db();
  if (!g.__acc_gift_schema) g.__acc_gift_schema = sql.unsafe(SCHEMA).then(() => undefined).catch((e) => { g.__acc_gift_schema = undefined; throw e; });
  await g.__acc_gift_schema;
  return sql;
}

const PAID = ["paid", "activating", "active"];
// No 0/O or 1/I: easy to read out and type from an SMS.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export type GiftInput = { amount: number; theme: string; fromName: string; toName: string; message: string; toMobile?: string; sendAt?: number | null };

/** Creates the gift card order (unpaid). The caller sends the buyer to the gateway with payOrder. */
export async function createGift(mobile: string, input: Partial<GiftInput>): Promise<{ code: string; gift: string } | { error: string }> {
  const amount = Math.trunc(Number(input.amount));
  if (!(GIFT_AMOUNTS as readonly number[]).includes(amount)) return { error: "bad_amount" };
  const toName = clip(input.toName, GIFT_LIMITS.name);
  if (!toName) return { error: "bad_to_name" };
  const fromName = clip(input.fromName, GIFT_LIMITS.name);
  if (!fromName) return { error: "bad_from_name" };
  const message = String(input.message ?? "").trim().slice(0, GIFT_LIMITS.message);
  let toMobile: string | null = null;
  if (input.toMobile && String(input.toMobile).trim()) {
    if (!validMobile(String(input.toMobile))) return { error: "bad_mobile" };
    toMobile = normalizeMobile(String(input.toMobile));
  }
  let sendAt: Date | null = null;
  if (input.sendAt) {
    const t = Number(input.sendAt);
    if (!Number.isFinite(t) || t > Date.now() + 366 * 86_400_000) return { error: "bad_time" };
    if (t > Date.now() + 60_000) sendAt = new Date(t);
  }
  const theme = themeById(input.theme).id;
  const sql = await giftDb();
  let orderCode = "", gift = "";
  await sql.begin(async (tx) => {
    for (let tries = 0; ; tries++) {
      orderCode = `AD-${randomInt(100000, 1000000)}`;
      const r = await tx`insert into orders (code, mobile, status, subtotal, discount, total)
        values (${orderCode}, ${mobile}, 'pending', ${amount}, 0, ${amount}) on conflict do nothing returning code`;
      if (r.length) break;
      if (tries > 5) throw new Error("could not allocate order code");
    }
    await tx`insert into order_lines (order_code, idx, product_id, plan, delivery, price)
      values (${orderCode}, 0, ${GIFT_ID}, ${String(amount)}, 'code', ${amount})`;
    for (let tries = 0; ; tries++) {
      gift = newCode();
      const r = await tx`insert into gifts (code, order_code, amount, theme, from_name, to_name, to_mobile, message, send_at)
        values (${gift}, ${orderCode}, ${amount}, ${theme}, ${fromName}, ${toName}, ${toMobile}, ${message}, ${sendAt})
        on conflict do nothing returning code`;
      if (r.length) break;
      if (tries > 5) throw new Error("could not allocate gift code");
    }
  });
  return { code: orderCode, gift };
}

/** Supplier hook for a paid gift card line: its "code" is the gift code. Also sends the SMS if it is due now. */
export async function issueGift(lineId: number): Promise<string[] | null> {
  const sql = await giftDb();
  const [r] = await sql`select g.code from gifts g join order_lines l on l.order_code = g.order_code where l.id = ${lineId}`;
  if (!r) return null;
  const job = () => deliverDueGifts().then(() => undefined).catch((e) => console.error("[gift]", e));
  try { after(job); } catch { void job(); }
  return [r.code];
}

/** Sends the SMS of every paid gift whose time has come. Safe to run often and in parallel (each gift is claimed once). */
export async function deliverDueGifts(): Promise<number> {
  const sql = await giftDb();
  const due = await sql`
    update gifts g set sent_at = now() from orders o
    where o.code = g.order_code and o.status in ${sql(PAID)} and g.to_mobile is not null and g.sent_at is null
      and (g.send_at is null or g.send_at <= now())
    returning g.code, g.to_mobile, g.from_name`;
  for (const x of due) await sendGiftSms(x.to_mobile, x.from_name, x.code).catch((e) => console.error("[gift sms]", e));
  return due.length;
}

/** Runs deliverDueGifts after the current request, at most once a minute per server. Called on page visits. */
export function kickGiftDelivery() {
  if (process.env.NEXT_PHASE === "phase-production-build" || !dbUrl()) return;
  const now = Date.now();
  if (now - (g.__acc_gift_kick ?? 0) < 60_000) return;
  g.__acc_gift_kick = now;
  const job = () => deliverDueGifts().then(() => undefined).catch((e) => console.error("[gift]", e));
  try { after(job); } catch { void job(); }
}

/** SMS to the recipient (template with %token = sender's name, %token2 = gift code, linking to accdrop.ir/g/%token2). */
async function sendGiftSms(mobile: string, fromName: string, code: string) {
  const t = process.env.KAVENEGAR_GIFT_TEMPLATE;
  if (t || !smsConfigured()) await lookup(mobile, t || "accdrop-gift", [fromName.slice(0, 30) || "یک دوست", code]);
}
/** Optional SMS to the sender once the gift is redeemed (%token = recipient's name). */
async function sendGiftOpenedSms(mobile: string, toName: string) {
  const t = process.env.KAVENEGAR_GIFT_OPENED_TEMPLATE;
  if (t || !smsConfigured()) await lookup(mobile, t || "accdrop-gift-opened", [toName.slice(0, 30)]);
}

/** What the gift link shows to `viewer` (null = signed out). Unpaid gifts don't exist for anyone but the sender. */
export async function viewGift(raw: string, viewer: string | null): Promise<GiftView | null> {
  const code = cleanCode(raw);
  if (code.length !== 12) return null;
  const sql = await giftDb();
  const [x] = await sql`select g.*, o.mobile as buyer, o.status from gifts g join orders o on o.code = g.order_code where g.code = ${code}`;
  if (!x) return null;
  const mine = viewer && viewer === x.buyer ? "sender" : viewer && viewer === x.redeemed_by ? "receiver" : null;
  if (!PAID.includes(x.status) && mine !== "sender") return null;
  const sendAt = ms(x.send_at);
  const locked = !!sendAt && sendAt > Date.now() && !x.sent_at && mine !== "sender";
  if (!locked && mine !== "sender" && !x.opened_at) await sql`update gifts set opened_at = now() where code = ${code} and opened_at is null`;
  return {
    code, amount: Number(x.amount), theme: x.theme, toName: x.to_name, sendAt, locked,
    fromName: locked ? "" : x.from_name, message: locked ? "" : x.message,
    redeemed: !!x.redeemed_at, redeemedAt: ms(x.redeemed_at), mine,
  };
}

/** Adds the gift to `mobile`'s credit. Returns the amount, or why not. */
export async function redeemGift(raw: string, mobile: string): Promise<{ amount: number; balance: number } | { error: string }> {
  const code = cleanCode(raw);
  if (code.length !== 12) return { error: "not_found" };
  const sql = await giftDb();
  let amount = 0, notify: { buyer: string; toName: string } | null = null;
  const err = await sql.begin(async (tx) => {
    const [x] = await tx`select g.*, o.mobile as buyer, o.status from gifts g join orders o on o.code = g.order_code where g.code = ${code} for update of g`;
    if (!x || !PAID.includes(x.status)) return "not_found";
    if (x.redeemed_at) return x.redeemed_by === mobile ? "already_mine" : "already_used";
    if (x.send_at && new Date(x.send_at).getTime() > Date.now() && !x.sent_at && x.buyer !== mobile) return "locked";
    amount = Number(x.amount);
    await tx`update gifts set redeemed_by = ${mobile}, redeemed_at = now(), opened_at = coalesce(opened_at, now()) where code = ${code}`;
    await tx`insert into credit_ledger (mobile, amount, reason, ref) values (${mobile}, ${amount}, 'gift', ${code})`;
    if (x.buyer !== mobile) notify = { buyer: x.buyer, toName: x.to_name };
    return "";
  });
  if (err) return { error: err };
  const n = notify as { buyer: string; toName: string } | null;
  if (n) await sendGiftOpenedSms(n.buyer, n.toName).catch((e) => console.error("[gift sms]", e));
  return { amount, balance: await creditBalance(mobile) };
}

/** Gift cards `mobile` has bought (paid or waiting for payment), newest first. */
export async function sentGifts(mobile: string): Promise<SentGift[]> {
  const sql = await giftDb();
  const rows = await sql`select g.*, o.status from gifts g join orders o on o.code = g.order_code
    where o.mobile = ${mobile} order by g.created_at desc limit 100`;
  return rows.map((x) => ({
    code: x.code, orderCode: x.order_code, amount: Number(x.amount), theme: x.theme, toName: x.to_name, toMobile: x.to_mobile,
    sendAt: ms(x.send_at), sentAt: ms(x.sent_at), openedAt: ms(x.opened_at), redeemedAt: ms(x.redeemed_at), paid: PAID.includes(x.status),
  }));
}

// ----- Credit -----

/** Credit spent or held by orders: paid ones, plus the customer's latest unpaid order for 24 hours. */
const spentSql = (sql: Sql, mobile: string) => sql`
  select coalesce(sum(o.credit), 0)::bigint as n from orders o
  where o.mobile = ${mobile} and o.credit > 0 and (o.status in ${sql(PAID)}
    or (o.status in ('pending', 'canceled') and o.created_at > now() - interval '24 hours'
      and not exists (select 1 from orders x where x.mobile = o.mobile and x.created_at > o.created_at)))`;

export async function creditBalance(mobile: string, tx?: Sql): Promise<number> {
  const sql = tx ?? (await giftDb());
  const [[a], [b]] = await Promise.all([
    sql`select coalesce(sum(amount), 0)::bigint as n from credit_ledger where mobile = ${mobile}`,
    spentSql(sql, mobile),
  ]);
  return Math.max(0, Number(a.n) - Number(b.n));
}

/** Everything added to and spent from the credit, newest first. */
export async function creditHistory(mobile: string): Promise<CreditEntry[]> {
  const sql = await giftDb();
  const [add, spent] = await Promise.all([
    sql`select amount, reason, ref, created_at from credit_ledger where mobile = ${mobile} order by id desc limit 100`,
    sql`select credit, code, coalesce(paid_at, created_at) as at from orders
      where mobile = ${mobile} and credit > 0 and status in ${sql(PAID)} order by created_at desc limit 100`,
  ]);
  return [
    ...add.map((x) => ({ amount: Number(x.amount), reason: x.reason as CreditEntry["reason"], ref: x.ref, at: ms(x.created_at)! })),
    ...spent.map((x) => ({ amount: -Number(x.credit), reason: "order" as const, ref: x.code, at: ms(x.at)! })),
  ].sort((a, b) => b.at - a.at);
}

/** Pays as much of a new, unpaid order as the customer's credit covers. Gift cards and «دنگ» shares can't use credit. */
export async function applyCredit(orderCode: string, mobile: string): Promise<number> {
  const sql = await giftDb();
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${"credit:" + mobile}))`;
    const [o] = await tx`select total, credit, status, split from orders where code = ${orderCode} and mobile = ${mobile} for update`;
    if (!o || o.status !== "pending" || o.split || Number(o.credit) > 0) return 0;
    if ((await tx`select 1 from order_lines where order_code = ${orderCode} and product_id = ${GIFT_ID}`).length) return 0;
    const use = Math.min(await creditBalance(mobile, tx as unknown as Sql), Number(o.total));
    if (use <= 0) return 0;
    await tx`update orders set credit = ${use}, total = total - ${use} where code = ${orderCode}`;
    return use;
  });
}

/** An unpaid order whose credit was released (a newer order took it, or 24 hours passed) can't be paid as it is. */
export async function creditExpired(orderCode: string): Promise<boolean> {
  const sql = await giftDb();
  const [o] = await sql`select o.credit, o.status, o.created_at < now() - interval '24 hours' as old,
      exists (select 1 from orders x where x.mobile = o.mobile and x.created_at > o.created_at) as newer
    from orders o where o.code = ${orderCode}`;
  return !!o && Number(o.credit) > 0 && (o.status === "pending" || o.status === "canceled") && (o.old || o.newer);
}
