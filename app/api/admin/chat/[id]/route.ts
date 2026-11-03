import { adminReply, adminSetStatus, adminThread } from "@/lib/server/chat";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (req: Request, { params }: Ctx) => withAdmin(async () => {
  const t = await adminThread(Number((await params).id), Number(new URL(req.url).searchParams.get("after")) || 0);
  return t ? json(t) : fail("not_found", 404);
}));

export const POST = route(async (req: Request, { params }: Ctx) => withAdmin(async () => {
  const id = Number((await params).id);
  const b = await body<{ body: string; status: "open" | "closed" }>(req);
  if (b.status === "open" || b.status === "closed") { await adminSetStatus(id, b.status); return json({ ok: true }); }
  const m = await adminReply(id, String(b.body ?? ""));
  return m ? json({ message: m }) : fail("empty");
}));
