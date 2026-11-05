import { body, fail, json, route, withUser } from "@/lib/server/http";
import { createGift, sentGifts, type GiftInput } from "@/lib/server/gifts";
import { asMethod, payOrder } from "@/lib/server/orders";

/** Gift cards the signed-in customer has sent. */
export const GET = route(async () => withUser(async (u) => json({ gifts: await sentGifts(u.mobile) })));

/** Buys a gift card: creates the order and returns where to pay for it. */
export const POST = route(async (req: Request) => withUser(async (u) => {
  const b = await body<GiftInput & { method: string }>(req);
  const r = await createGift(u.mobile, { ...b, fromName: b.fromName || u.name });
  if ("error" in r) return fail(r.error);
  const p = await payOrder(r.code, u.mobile, asMethod(b.method));
  return "error" in p ? fail(p.error) : json({ code: r.code, gift: r.gift, payUrl: p.url });
}));
