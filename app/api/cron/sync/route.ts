import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { dbUrl } from "@/lib/server/db";
import { runSync } from "@/lib/server/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel cron (vercel.json): supplier prices and stock. With CRON_SECRET set, only Vercel's cron can call it. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbUrl()) return NextResponse.json({ error: "no_database" }, { status: 503 });
  const summary = await runSync("cron", 2);
  if (summary?.changes.length) revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, ran: !!summary, summary }, { headers: { "cache-control": "no-store" } });
}
