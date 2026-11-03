import { body, fail, json, route, withUser } from "@/lib/server/http";
import { getLegal, saveLegal } from "@/lib/server/legal";

export const GET = route(async () => withUser(async (u) => json({ legal: await getLegal(u.mobile) })));

export const POST = route(async (req: Request) => withUser(async (u) => {
  const r = await saveLegal(u.mobile, await body(req));
  return "error" in r ? fail("bad_field", 400, { field: r.error }) : json({ legal: r.info });
}));
