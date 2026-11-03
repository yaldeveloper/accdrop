import { adminReviews, moderate } from "@/lib/server/reviews";
import { body, json, route, withAdmin } from "@/lib/server/http";

export const GET = route(async (req: Request) => withAdmin(async () =>
  json({ reviews: await adminReviews(new URL(req.url).searchParams.get("status") ?? "pending") })));

export const POST = route(async (req: Request) => withAdmin(async () => {
  const b = await body<{ id: number; status: string; reply: string }>(req);
  await moderate(Number(b.id), { status: b.status, reply: b.reply });
  return json({ ok: true });
}));
