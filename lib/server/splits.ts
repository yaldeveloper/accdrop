// «دنگ»: a group buy where every member pays their own share. The organizer opens a group for N people at a locked
// per-person price and shares the link; each member joins with their own account and pays one seat. Activation waits
// until all N have paid, or until the organizer closes the group early with at least two paid members.
import { randomInt } from "node:crypto";
import { DELIVERY, MAX_SEATS, groupOff, priceOf, PRODUCTS, type DeliveryType } from "@/lib/catalog";
import { SPLIT_HOURS, type SplitView } from "@/lib/billing";
import { loadCatalog } from "./catalog";
import { db } from "./db";
import { createOrder, fulfilInstant, payOrder, type LineInput, type PayMethod } from "./orders";
import { sendSplitSms } from "./sms";

const PAID = ["paid", "activating", "active"];
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Opens a new group. The per-person price is fixed now, so it doesn't move while friends join. */
export async function createSplit(owner: string, x: { id?: string; plan?: string; type?: string; seats?: number }) {
  await loadCatalog();
  const p = PRODUCTS.find((q) => q.id === x.id);
  const seats = Math.trunc(Number(x.seats));
  if (!p || p.hidden || !p.group?.length || !x.plan || !x.type || !(x.type in DELIVERY) || !p.plans[x.plan]?.[x.type as DeliveryType]) return { error: "bad_item" };
  if (!(seats >= 2 && seats <= MAX_SEATS)) return { error: "bad_seats" };
  const unit = Math.round((priceOf({ id: p.id, plan: x.plan, type: x.type as DeliveryType }).price * (100 - groupOff(p, seats))) / 100 / 1000) * 1000;
  const sql = await db();
  for (let i = 0; i < 6; i++) {
    const code = Array.from({ length: 6 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
    const r = await sql`insert into splits (code, owner, product_id, plan, delivery, seats, unit, expires_at)
      values (${code}, ${owner}, ${p.id}, ${x.plan}, ${x.type}, ${seats}, ${unit}, now() + ${SPLIT_HOURS + " hours"}::interval)
      on conflict do nothing returning code`;
    if (r.length) return { code };
  }
  throw new Error("could not allocate split code");
}

/** Public view of a group; `viewer` sees which member they are and their own order. */
export async function viewSplit(code: string, viewer?: string): Promise<SplitView | null> {
  const sql = await db();
  const [s] = await sql`select s.*, u.name as owner_name from splits s join users u on u.mobile = s.owner where s.code = ${code.toUpperCase()}`;
  if (!s) return null;
  // Everyone with an order in the group; the organizer is listed first even before paying.
  const rows = await sql`select distinct on (o.mobile) o.mobile, o.code, o.status, u.name from orders o join users u on u.mobile = o.mobile
    where o.split = ${s.code} order by o.mobile, (o.status in ('paid','activating','active')) desc, o.created_at desc`;
  const first = (n: string) => (n || "").trim().split(/\s+/)[0] || "";
  const members = rows
    .map((r) => ({ name: first(r.name) || `کاربر ${r.mobile.slice(-4)}`, paid: PAID.includes(r.status), me: r.mobile === viewer, owner: r.mobile === s.owner }))
    .sort((a, b) => Number(b.owner) - Number(a.owner) || Number(b.paid) - Number(a.paid));
  if (!members.some((m) => m.owner)) members.unshift({ name: first(s.owner_name) || "سازنده گروه", paid: false, me: s.owner === viewer, owner: true });
  const mine = viewer ? rows.find((r) => r.mobile === viewer) : undefined;
  return {
    code: s.code, productId: s.product_id, plan: s.plan, type: s.delivery, seats: Number(s.seats), unit: Number(s.unit),
    status: s.status, expired: s.status === "open" && new Date(s.expires_at).getTime() < Date.now(),
    expiresAt: new Date(s.expires_at).getTime(), createdAt: new Date(s.created_at).getTime(),
    owner: first(s.owner_name) || "سازنده گروه", isOwner: s.owner === viewer,
    paid: members.filter((m) => m.paid).length, members, mine: mine ? { code: mine.code, status: mine.status } : null,
  };
}

/** Joins the group (or retries an unpaid share) and starts payment for one seat. */
export async function joinSplit(code: string, mobile: string, x: { email?: string; username?: string; method?: PayMethod }) {
  const v = await viewSplit(code, mobile);
  if (!v) return { error: "not_found" };
  if (v.mine && PAID.includes(v.mine.status)) return { url: `/orders/${v.mine.code}` };
  if (v.status !== "open" || v.expired) return { error: "closed" };
  if (v.paid >= v.seats) return { error: "full" };
  const method = x.method ?? "card";
  if (v.mine) return payOrder(v.mine.code, mobile, method);
  const line: LineInput = { id: v.productId, plan: v.plan, type: v.type as DeliveryType, email: x.email, username: x.username, seats: 1 };
  const r = await createOrder(mobile, [line], "", { split: { code: v.code, unit: v.unit } });
  if ("error" in r) return r;
  return payOrder(r.code, mobile, method);
}

/** Called after a share is paid: completes the group when every seat is paid. */
export async function onSplitPaid(code: string) {
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from orders where split = ${code} and status in ('paid', 'activating', 'active')`;
  const r = await sql`update splits set status = 'full' where code = ${code} and status = 'open' and seats <= ${n} returning owner`;
  if (r.length) {
    await fulfilInstant(sql);
    await sendSplitSms(r[0].owner, code).catch((e) => console.error(e));
  }
}

/** Organizer: close early with the members who have paid (at least two), or cancel when nobody else has. */
export async function closeSplit(code: string, owner: string) {
  const v = await viewSplit(code, owner);
  if (!v || !v.isOwner) return { error: "not_found" };
  if (v.status !== "open") return { error: "closed" };
  const sql = await db();
  if (v.paid >= 2) {
    await sql`update splits set status = 'closed' where code = ${v.code} and status = 'open'`;
    await fulfilInstant(sql);
    return { status: "closed" as const };
  }
  await sql`update splits set status = 'canceled' where code = ${v.code} and status = 'open'`;
  return { status: "canceled" as const };
}
