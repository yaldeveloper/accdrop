import { normalizeMobile, validMobile } from "@/lib/account";
import { requestOtp } from "@/lib/server/auth";
import { body, fail, json, route } from "@/lib/server/http";

export const POST = route(async (req: Request) => {
  const { mobile } = await body<{ mobile: string }>(req);
  if (!validMobile(mobile ?? "")) return fail("bad_mobile");
  const r = await requestOtp(normalizeMobile(mobile!));
  return r.ok ? json({ ok: true }) : fail(r.error, 429, { wait: r.wait });
});
