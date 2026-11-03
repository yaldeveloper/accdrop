import { db } from "./db";

export type Review = { id: number; productId: string; name: string; rating: number; body: string; verified: boolean; reply: string; at: number; status: string; mobile?: string };
const row = (r: Record<string, unknown>, admin = false): Review => ({
  id: Number(r.id), productId: String(r.product_id), name: String(r.name || "کاربر اک‌دراپ"), rating: Number(r.rating), body: String(r.body),
  verified: !!r.verified, reply: String(r.reply ?? ""), at: new Date(r.created_at as string).getTime(), status: String(r.status),
  ...(admin ? { mobile: String(r.mobile) } : {}),
});

/** Approved reviews for a set of product ids (a product family), newest first, plus the average. */
export async function productReviews(ids: string[], mobile?: string) {
  const sql = await db();
  const rows = await sql`select * from reviews where product_id in ${sql(ids)} and status = 'approved' order by created_at desc limit 50`;
  const [s] = await sql`select count(*)::int as n, coalesce(avg(rating), 0)::float as avg from reviews where product_id in ${sql(ids)} and status = 'approved'`;
  const dist = await sql`select rating, count(*)::int as n from reviews where product_id in ${sql(ids)} and status = 'approved' group by rating`;
  const mine = mobile ? (await sql`select * from reviews where product_id in ${sql(ids)} and mobile = ${mobile} limit 1`)[0] : undefined;
  return {
    reviews: rows.map((r) => row(r)), count: s.n as number, avg: Math.round(Number(s.avg) * 10) / 10,
    dist: Object.fromEntries(dist.map((d) => [d.rating, d.n])) as Record<number, number>,
    mine: mine ? row(mine) : null,
  };
}

export async function addReview(u: { mobile: string; name: string }, productId: string, rating: number, body: string) {
  const sql = await db();
  const text = body.trim().slice(0, 1200);
  if (!(rating >= 1 && rating <= 5) || text.length < 5) return { error: "bad_input" };
  const [v] = await sql`select 1 from order_lines l join orders o on o.code = l.order_code
    where o.mobile = ${u.mobile} and l.product_id = ${productId} and o.status in ('paid','activating','active') limit 1`;
  const r = await sql`insert into reviews (product_id, mobile, name, rating, body, verified)
    values (${productId}, ${u.mobile}, ${u.name}, ${Math.round(rating)}, ${text}, ${!!v})
    on conflict (product_id, mobile) do update set rating = excluded.rating, body = excluded.body, status = 'pending', created_at = now()
    returning *`;
  return { review: row(r[0]) };
}

export async function adminReviews(status: string) {
  const sql = await db();
  const rows = status === "all"
    ? await sql`select * from reviews order by created_at desc limit 200`
    : await sql`select * from reviews where status = ${status} order by created_at desc limit 200`;
  return rows.map((r) => row(r, true));
}

export async function moderate(id: number, patch: { status?: string; reply?: string }) {
  const sql = await db();
  if (patch.status && ["approved", "rejected", "pending"].includes(patch.status)) await sql`update reviews set status = ${patch.status} where id = ${id}`;
  if (typeof patch.reply === "string") await sql`update reviews set reply = ${patch.reply.trim().slice(0, 1200)} where id = ${id}`;
}

export async function pendingReviewCount() {
  const sql = await db();
  const [r] = await sql`select count(*)::int as n from reviews where status = 'pending'`;
  return Number(r.n);
}
