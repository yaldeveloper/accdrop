import { NextResponse } from "next/server";
import { currentUser, type SessionUser } from "./auth";
import { dbUrl } from "./db";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
export const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);

/** Wraps a route: reports a missing database clearly and hides internal errors. */
export function route<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A) => {
    if (!dbUrl()) return fail("no_database", 503);
    try { return await fn(...a); } catch (e) { console.error(e); return fail("server_error", 500); }
  };
}

export async function body<T>(req: Request): Promise<Partial<T>> {
  try { return (await req.json()) as Partial<T>; } catch { return {}; }
}

export async function withUser(f: (u: SessionUser) => Promise<Response>) {
  const u = await currentUser();
  return u ? f(u) : fail("unauthorized", 401);
}
export async function withAdmin(f: (u: SessionUser) => Promise<Response>) {
  const u = await currentUser();
  return !u ? fail("unauthorized", 401) : !u.isAdmin ? fail("forbidden", 403) : f(u);
}
