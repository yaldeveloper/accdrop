// Live chat between site visitors (signed in or not) and the admins. Visitors are identified by an anonymous cookie.
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "ad_v";
export type ChatMsg = { id: number; author: "user" | "admin"; body: string; at: number };
export type ChatRow = { id: number; name: string; mobile: string | null; page: string; status: "open" | "closed"; unread: number; updatedAt: number; last: string };

const msg = (r: Record<string, unknown>): ChatMsg => ({ id: Number(r.id), author: r.author as ChatMsg["author"], body: String(r.body), at: new Date(r.created_at as string).getTime() });

/** The visitor id from the cookie; creates one when `create` is set. */
export async function visitorId(create = false) {
  const jar = await cookies();
  let v = jar.get(COOKIE)?.value;
  if (v && /^[a-f0-9]{32}$/.test(v)) return v;
  if (!create) return null;
  v = randomBytes(16).toString("hex");
  jar.set(COOKIE, v, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180 });
  return v;
}

export async function visitorThread(visitor: string, after = 0) {
  const sql = await db();
  const [c] = await sql`select id, status, unread_user from chats where visitor = ${visitor}`;
  if (!c) return { messages: [] as ChatMsg[], status: "none" as const, unread: 0 };
  const rows = await sql`select id, author, body, created_at from chat_messages where chat_id = ${c.id} and id > ${after} order by id limit 200`;
  if (c.unread_user) await sql`update chats set unread_user = 0 where id = ${c.id}`;
  return { messages: rows.map(msg), status: c.status as "open" | "closed", unread: Number(c.unread_user) };
}

export async function visitorSend(visitor: string, text: string, page: string, user: { mobile: string; name: string } | null) {
  const sql = await db();
  const body = text.trim().slice(0, 1500);
  if (!body) return { error: "empty" };
  const [c] = await sql`
    insert into chats (visitor, mobile, name, page, status, unread_admin, updated_at)
    values (${visitor}, ${user?.mobile ?? null}, ${user?.name ?? ""}, ${page.slice(0, 200)}, 'open', 1, now())
    on conflict (visitor) do update set status = 'open', unread_admin = chats.unread_admin + 1, updated_at = now(),
      page = excluded.page, mobile = coalesce(excluded.mobile, chats.mobile), name = case when excluded.name <> '' then excluded.name else chats.name end
    returning id`;
  const [{ n }] = await sql`select count(*)::int as n from chat_messages where chat_id = ${c.id} and author = 'user' and created_at > now() - interval '1 minute'`;
  if (n >= 12) return { error: "too_many" };
  const [m] = await sql`insert into chat_messages (chat_id, author, body) values (${c.id}, 'user', ${body}) returning id, author, body, created_at`;
  return { message: msg(m) };
}

export async function adminChats(): Promise<ChatRow[]> {
  const sql = await db();
  const rows = await sql`
    select c.*, (select body from chat_messages m where m.chat_id = c.id order by id desc limit 1) as last,
      (select name from users u where u.mobile = c.mobile) as uname
    from chats c order by (c.status = 'open') desc, c.updated_at desc limit 100`;
  return rows.map((r) => ({ id: r.id, name: r.uname || r.name || "", mobile: r.mobile, page: r.page, status: r.status, unread: Number(r.unread_admin), updatedAt: new Date(r.updated_at).getTime(), last: r.last ?? "" }));
}

export async function adminThread(id: number, after = 0) {
  const sql = await db();
  const [c] = await sql`select * from chats where id = ${id}`;
  if (!c) return null;
  const rows = await sql`select id, author, body, created_at from chat_messages where chat_id = ${id} and id > ${after} order by id limit 300`;
  if (c.unread_admin) await sql`update chats set unread_admin = 0 where id = ${id}`;
  return { status: c.status as "open" | "closed", mobile: c.mobile as string | null, page: c.page as string, messages: rows.map(msg) };
}

export async function adminReply(id: number, text: string) {
  const sql = await db();
  const body = text.trim().slice(0, 3000);
  if (!body) return null;
  const [m] = await sql`insert into chat_messages (chat_id, author, body) values (${id}, 'admin', ${body}) returning id, author, body, created_at`;
  await sql`update chats set unread_user = unread_user + 1, updated_at = now() where id = ${id}`;
  return msg(m);
}

export async function adminSetStatus(id: number, status: "open" | "closed") {
  const sql = await db();
  await sql`update chats set status = ${status}, unread_admin = 0 where id = ${id}`;
}

export async function openChatCount() {
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from chats where status = 'open' and unread_admin > 0`;
  return Number(n);
}
