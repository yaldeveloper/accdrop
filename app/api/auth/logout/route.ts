import { logout } from "@/lib/server/auth";
import { json, route } from "@/lib/server/http";

export const POST = route(async () => { await logout(); return json({ ok: true }); });
