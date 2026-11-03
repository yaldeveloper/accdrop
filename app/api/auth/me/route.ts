import { validEmail } from "@/lib/account";
import { currentUser, demoLogin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { body, fail, json, route, withUser } from "@/lib/server/http";
import { gatewayConfigured } from "@/lib/server/pay";

export const GET = route(async () => json({ user: await currentUser(), demo: { login: demoLogin(), gateway: !gatewayConfigured()} }));

export const PATCH = route(async (req: Request) => withUser(async (u) => {
  const { name, email } = await body<{ name: string; email: string }>(req);
  if (email !== undefined && email !== "" && !validEmail(email)) return fail("bad_email");
  if (name !== undefined && name.length > 80) return fail("bad_name");
  const sql = await db();
  await sql`update users set name = ${name?.trim() ?? u.name}, email = ${email?.trim().toLowerCase() ?? u.email} where mobile = ${u.mobile}`;
  return json({ user: await currentUser() });
}));
