import { json, route, withUser } from "@/lib/server/http";
import { creditBalance, creditHistory } from "@/lib/server/gifts";

/** The customer's AccDrop credit and its history. */
export const GET = route(async (req: Request) => withUser(async (u) => {
  const full = new URL(req.url).searchParams.has("history");
  const [balance, history] = await Promise.all([creditBalance(u.mobile), full ? creditHistory(u.mobile) : Promise.resolve(undefined)]);
  return json({ balance, history });
}));
