import { NextResponse } from "next/server";
import { dbUrl } from "@/lib/server/db";
import { deliverDueGifts } from "@/lib/server/gifts";

export const dynamic = "force-dynamic";

/**
 * Sends scheduled gift card SMS whose time has come. Visits already do this (at most once a minute), so this is only
 * needed for exact timing on a quiet site: call it every few minutes from any external cron (e.g. cron-job.org) with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbUrl()) return NextResponse.json({ error: "no_database" }, { status: 503 });
  return NextResponse.json({ ok: true, sent: await deliverDueGifts() }, { headers: { "cache-control": "no-store" } });
}
