import { PRODUCTS, variantsOf } from "@/lib/catalog";
import { currentUser } from "@/lib/server/auth";
import { loadCatalog } from "@/lib/server/catalog";
import { addReview, productReviews } from "@/lib/server/reviews";
import { body, fail, json, route, withUser } from "@/lib/server/http";

/** Reviews are shared across a product's variants (ChatGPT Go, Plus and Pro show the same list). */
export const GET = route(async (req: Request) => {
  await loadCatalog();
  const p = PRODUCTS.find((x) => x.id === new URL(req.url).searchParams.get("p"));
  if (!p) return fail("not_found", 404);
  const u = await currentUser();
  return json(await productReviews(variantsOf(p).map((x) => x.id), u?.mobile));
});

export const POST = route(async (req: Request) => withUser(async (u) => {
  await loadCatalog();
  const b = await body<{ product: string; rating: number; body: string }>(req);
  if (!PRODUCTS.some((x) => x.id === b.product)) return fail("not_found", 404);
  const r = await addReview(u, String(b.product), Number(b.rating), String(b.body ?? ""));
  return "error" in r ? fail(r.error!) : json(r);
}));
