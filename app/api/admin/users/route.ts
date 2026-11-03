import { db } from "@/lib/server/db";
import { body, json, route, withAdmin } from "@/lib/server/http";

export const GET = route(async (req: Request) => withAdmin(async () => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  const sql = await db();
  const rows = await sql`
    select u.mobile, u.name, u.email, u.blocked, u.created_at,
      count(o.code) filter (where o.status in ('paid','activating','active'))::int as orders,
      coalesce(sum(o.total) filter (where o.status in ('paid','activating','active')), 0)::bigint as spent
    from users u left join orders o on o.mobile = u.mobile
    where ${q ? sql`u.mobile like ${"%" + q + "%"} or u.name ilike ${"%" + q + "%"} or u.email ilike ${"%" + q + "%"}` : sql`true`}
    group by u.mobile order by u.created_at desc limit 300`;
  return json({ users: rows.map((r) => ({ mobile: r.mobile, name: r.name, email: r.email, blocked: r.blocked, orders: r.orders, spent: Number(r.spent), createdAt: new Date(r.created_at).getTime() })) });
}));

export const PATCH = route(async (req: Request) => withAdmin(async (me) => {
  const { mobile, blocked } = await body<{ mobile: string; blocked: boolean }>(req);
  const sql = await db();
  if (mobile && mobile !== me.mobile) {
    await sql`update users set blocked = ${!!blocked} where mobile = ${mobile}`;
    if (blocked) await sql`delete from sessions where mobile = ${mobile}`;
  }
  return json({ ok: true });
}));
