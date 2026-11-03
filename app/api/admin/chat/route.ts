import { adminChats } from "@/lib/server/chat";
import { json, route, withAdmin } from "@/lib/server/http";

export const GET = route(async () => withAdmin(async () => json({ chats: await adminChats() })));
