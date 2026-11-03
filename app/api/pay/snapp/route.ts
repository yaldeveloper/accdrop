import { NextResponse } from "next/server";
import { route } from "@/lib/server/http";
import { completeBnpl } from "@/lib/server/orders";

// SnappPay sends the customer back here (form POST) with transactionId, state=OK|FAILED and amount.
async function handle(req: Request) {
  let f: URLSearchParams;
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    f = ct.includes("json") ? new URLSearchParams(Object.entries(await req.json().catch(() => ({}))).map(([k, v]) => [k, String(v)])) : new URLSearchParams(await req.text());
  } else f = new URL(req.url).searchParams;
  const code = await completeBnpl(f.get("transactionId") ?? "", f.get("state") ?? "");
  return NextResponse.redirect(new URL(code ? `/orders/${code}?from=pay` : "/account/orders", req.url), 303);
}
export const POST = route(handle);
export const GET = route(handle);
