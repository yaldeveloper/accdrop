import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { sendOtpSms, smsConfigured } from "./sms";

const COOKIE = "ad_s";
const SESSION_DAYS = 30;
const OTP_TTL_S = 180;
const OTP_GAP_S = 55;
const OTP_PER_HOUR = 6;
const OTP_ATTEMPTS = 5;

const secret = () => process.env.AUTH_SECRET || "accdrop-dev-secret";
const hash = (s: string) => createHash("sha256").update(`${secret()}:${s}`).digest("hex");

export type SessionUser = { mobile: string; name: string; email: string; createdAt: number; isAdmin: boolean };

export const isAdminMobile = (m: string) =>
  (process.env.ADMIN_MOBILES || "").split(/[,\s]+/).filter(Boolean).includes(m);

/** Demo login (fixed code 12345) is on only while no SMS provider is configured. */
export const demoLogin = () => !smsConfigured();

export async function requestOtp(mobile: string): Promise<{ ok: true } | { ok: false; error: string; wait?: number }> {
  const sql = await db();
  const [row] = await sql`select sent_at, window_start, sends from otps where mobile = ${mobile}`;
  const now = Date.now();
  let sends = 1, windowStart = new Date(now);
  if (row) {
    const since = (now - new Date(row.sent_at).getTime()) / 1000;
    if (since < OTP_GAP_S) return { ok: false, error: "too_soon", wait: Math.ceil(OTP_GAP_S - since) };
    const inWindow = now - new Date(row.window_start).getTime() < 3600_000;
    if (inWindow && row.sends >= OTP_PER_HOUR) return { ok: false, error: "too_many" };
    sends = inWindow ? row.sends + 1 : 1;
    windowStart = inWindow ? new Date(row.window_start) : new Date(now);
  }
  const code = demoLogin() ? "12345" : String(randomInt(10000, 100000));
  await sql`
    insert into otps (mobile, code_hash, expires_at, attempts, sent_at, window_start, sends)
    values (${mobile}, ${hash(mobile + code)}, ${new Date(now + OTP_TTL_S * 1000)}, 0, now(), ${windowStart}, ${sends})
    on conflict (mobile) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0,
      sent_at = now(), window_start = excluded.window_start, sends = excluded.sends`;
  const sent = await sendOtpSms(mobile, code);
  return sent ? { ok: true } : { ok: false, error: "sms_failed" };
}

export async function verifyOtp(mobile: string, code: string): Promise<{ ok: boolean; isNew: boolean; error?: string }> {
  const sql = await db();
  const [row] = await sql`select code_hash, expires_at, attempts from otps where mobile = ${mobile}`;
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return { ok: false, isNew: false, error: "expired" };
  if (row.attempts >= OTP_ATTEMPTS) return { ok: false, isNew: false, error: "too_many" };
  const a = Buffer.from(row.code_hash), b = Buffer.from(hash(mobile + code));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await sql`update otps set attempts = attempts + 1 where mobile = ${mobile}`;
    return { ok: false, isNew: false, error: "wrong" };
  }
  await sql`delete from otps where mobile = ${mobile}`;
  const [u] = await sql`
    insert into users (mobile) values (${mobile}) on conflict (mobile) do update set mobile = excluded.mobile
    returning name, blocked, (xmax = 0) as inserted`;
  if (u.blocked) return { ok: false, isNew: false, error: "blocked" };
  const token = randomBytes(32).toString("base64url");
  await sql`insert into sessions (token_hash, mobile, expires_at) values (${hash(token)}, ${mobile}, ${new Date(Date.now() + SESSION_DAYS * 86400_000)})`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true, isNew: u.inserted || !u.name };
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const sql = await db();
  const [u] = await sql`
    select u.mobile, u.name, u.email, u.created_at from sessions s join users u on u.mobile = s.mobile
    where s.token_hash = ${hash(token)} and s.expires_at > now() and not u.blocked`;
  if (!u) return null;
  return { mobile: u.mobile, name: u.name, email: u.email, createdAt: new Date(u.created_at).getTime(), isAdmin: isAdminMobile(u.mobile) };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) { const sql = await db(); await sql`delete from sessions where token_hash = ${hash(token)}`; }
  jar.delete(COOKIE);
}
