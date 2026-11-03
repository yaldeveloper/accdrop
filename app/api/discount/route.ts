import { json, route } from "@/lib/server/http";
import { discountRate } from "@/lib/server/orders";

export const GET = route(async (req: Request) => json({ rate: await discountRate(new URL(req.url).searchParams.get("code") ?? "") }));
