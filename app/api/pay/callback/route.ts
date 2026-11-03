import { NextResponse } from "next/server";
import { route } from "@/lib/server/http";
import { completePayment } from "@/lib/server/orders";

// Zarinpal sends the customer back here with ?Authority=...&Status=OK|NOK.
export const GET = route(async (req: Request) => {
  const u = new URL(req.url);
  const code = await completePayment(u.searchParams.get("Authority") ?? "", u.searchParams.get("Status") === "OK");
  return NextResponse.redirect(new URL(code ? `/orders/${code}?from=pay` : "/account/orders", req.url), 303);
});
