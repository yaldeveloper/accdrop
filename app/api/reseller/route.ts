import { db } from "@/lib/server/db";
import { body, fail, json, route, withUser } from "@/lib/server/http";

const out = (r: Record<string, unknown> | undefined) => r ? {
  mobile: r.mobile, business: r.business, kind: r.kind, link: r.link, volume: r.volume, note: r.note,
  status: r.status, createdAt: new Date(r.created_at as string).getTime(),
} : null;

export const GET = route(async () => withUser(async (u) => {
  const sql = await db();
  const [r] = await sql`select * from resellers where mobile = ${u.mobile}`;
  return json({ reseller: out(r) });
}));

export const POST = route(async (req: Request) => withUser(async (u) => {
  const b = await body<{ business: string; kind: string; link: string; volume: string; note: string }>(req);
  const t = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
  if (!t(b.business, 120) || !t(b.kind, 80) || !t(b.volume, 80)) return fail("bad_input");
  const sql = await db();
  const [r] = await sql`
    insert into resellers (mobile, business, kind, link, volume, note)
    values (${u.mobile}, ${t(b.business, 120)}, ${t(b.kind, 80)}, ${t(b.link, 300)}, ${t(b.volume, 80)}, ${t(b.note, 1000)})
    on conflict (mobile) do update set business = excluded.business, kind = excluded.kind, link = excluded.link,
      volume = excluded.volume, note = excluded.note
    returning *`;
  return json({ reseller: out(r) });
}));
