import { db } from "@/lib/server/db";
import { fulfilInstant } from "@/lib/server/orders";

/** Cryptorefills calls this on every order state change. The body is not trusted: we only re-check that order's lines. */
async function handle(req: Request) {
  const code = new URL(req.url).searchParams.get("order")?.toUpperCase() ?? "";
  if (/^AD-\d{5,6}$/.test(code)) await fulfilInstant(await db(), code).catch((e) => console.error(e));
  return new Response("ok");
}
export const POST = handle;
export const GET = handle;
