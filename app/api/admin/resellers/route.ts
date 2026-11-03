import { db } from "@/lib/server/db";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";

export const GET = route(async () => withAdmin(async () => {
  const sql = await db();
  const rows = await sql`select r.*, u.name from resellers r join users u on u.mobile = r.mobile order by (r.status = 'pending') desc, r.created_at desc`;
  return json({ resellers: rows.map((r) => ({ ...r, createdAt: new Date(r.created_at).getTime() })) });
}));

export const PATCH = route(async (req: Request) => withAdmin(async () => {
  const { mobile, status } = await body<{ mobile: string; status: string }>(req);
  if (!["approved", "rejected", "pending"].includes(status ?? "")) return fail("bad_status");
  const sql = await db();
  await sql`update resellers set status = ${status!}, decided_at = now() where mobile = ${mobile ?? ""}`;
  return json({ ok: true });
}));
