import { db } from "@/lib/server/db";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";

const list = async () => {
  const sql = await db();
  const rows = await sql`select * from discounts order by created_at desc`;
  return rows.map((d) => ({ code: d.code, rate: Number(d.rate), active: d.active, uses: d.uses, maxUses: d.max_uses }));
};

export const GET = route(async () => withAdmin(async () => json({ discounts: await list() })));

export const POST = route(async (req: Request) => withAdmin(async () => {
  const b = await body<{ code: string; percent: number; maxUses: number | null; active: boolean }>(req);
  const code = String(b.code ?? "").trim().toUpperCase();
  const sql = await db();
  if (b.active !== undefined && b.percent === undefined) {
    await sql`update discounts set active = ${!!b.active} where code = ${code}`;
    return json({ discounts: await list() });
  }
  const pct = Number(b.percent);
  if (!/^[A-Z0-9_-]{3,24}$/.test(code) || !(pct > 0 && pct <= 100)) return fail("bad_input");
  const max = b.maxUses ? Math.max(1, Math.floor(Number(b.maxUses))) : null;
  await sql`insert into discounts (code, rate, max_uses) values (${code}, ${pct / 100}, ${max})
    on conflict (code) do update set rate = excluded.rate, max_uses = excluded.max_uses, active = true`;
  return json({ discounts: await list() });
}));
