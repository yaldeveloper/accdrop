import { NextResponse } from "next/server";
import { fivesimConfigured, liveOffers } from "@/lib/server/fivesim";

/** Countries with live virtual numbers for one service and our Toman price: GET /api/numbers?service=telegram */
export async function GET(req: Request) {
  const service = new URL(req.url).searchParams.get("service") ?? "telegram";
  if (!fivesimConfigured()) return NextResponse.json({ live: false, offers: [] });
  try {
    const offers = await liveOffers(service);
    return NextResponse.json({ live: true, offers }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ live: true, offers: [], error: "unavailable" }, { status: 502 });
  }
}
