import { NextResponse } from "next/server";
import { usdtRate } from "@/lib/server/crypto";

/** Live Toman price of one USDT (used to show crypto totals at checkout). */
export async function GET() {
  const { rate, source } = await usdtRate();
  return NextResponse.json({ rate, source }, { headers: { "cache-control": "public, max-age=60" } });
}
