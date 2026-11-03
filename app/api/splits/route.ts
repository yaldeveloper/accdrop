import { body, fail, json, route, withUser } from "@/lib/server/http";
import { createSplit } from "@/lib/server/splits";

export const POST = route(async (req: Request) => withUser(async (u) => {
  const r = await createSplit(u.mobile, await body(req));
  return "error" in r ? fail(r.error as string) : json(r);
}));
