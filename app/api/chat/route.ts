import { currentUser } from "@/lib/server/auth";
import { visitorId, visitorSend, visitorThread } from "@/lib/server/chat";
import { body, fail, json, route } from "@/lib/server/http";

export const GET = route(async (req: Request) => {
  const v = await visitorId();
  if (!v) return json({ messages: [], status: "none", unread: 0 });
  const after = Number(new URL(req.url).searchParams.get("after")) || 0;
  return json(await visitorThread(v, after));
});

export const POST = route(async (req: Request) => {
  const b = await body<{ body: string; page: string }>(req);
  const v = await visitorId(true);
  const u = await currentUser();
  const r = await visitorSend(v!, String(b.body ?? ""), String(b.page ?? ""), u ? { mobile: u.mobile, name: u.name } : null);
  return "error" in r ? fail(r.error!, r.error === "too_many" ? 429 : 400) : json(r);
});
