import { normalizeMobile, validMobile } from "@/lib/account";
import { verifyOtp } from "@/lib/server/auth";
import { body, fail, json, route } from "@/lib/server/http";

export const POST = route(async (req: Request) => {
  const { mobile, code } = await body<{ mobile: string; code: string }>(req);
  if (!validMobile(mobile ?? "") || !/^\d{5}$/.test(code ?? "")) return fail("bad_input");
  const r = await verifyOtp(normalizeMobile(mobile!), code!);
  return r.ok ? json({ ok: true, isNew: r.isNew }) : fail(r.error ?? "wrong", 400);
});
