import { revalidatePath } from "next/cache";
import { ALL_PRODUCTS } from "@/lib/catalog";
import { CONTENT } from "@/lib/content";
import { loadCatalog, resetProduct, saveProduct } from "@/lib/server/catalog";
import { cleanPatch } from "@/lib/server/product-input";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };
type Plans = Record<string, Partial<Record<string, number>>>;

/** Same options and types, each price within 3% (the rate may have moved since the form loaded). */
const samePrices = (a: Plans, b: Plans) => {
  const keys = (x: Plans) => Object.entries(x).flatMap(([k, o]) => Object.keys(o ?? {}).map((t) => `${k}|${t}`)).sort().join();
  if (keys(a) !== keys(b)) return false;
  return Object.entries(a).every(([k, o]) => Object.entries(o ?? {}).every(([t, v]) => Math.abs(Number(v) - Number(b[k]?.[t])) <= Number(b[k]?.[t]) * 0.03));
};

/** Saves the full edited state of a product (replaces any earlier edit). */
export const PUT = route(async (req: Request, { params }: Ctx) => withAdmin(async () => {
  const { id } = await params;
  const patches = await loadCatalog(true);
  const prev = patches.find((x) => x.id === id);
  if (!ALL_PRODUCTS.some((p) => p.id === id)) return fail("not_found", 404);
  const isNew = !!prev?.isNew;
  const patch = cleanPatch(id, isNew, await body(req));
  if ("error" in patch) return fail(patch.error);
  // Prices that follow the live Tether rate: keep them live unless the admin actually changed a price.
  const cur = ALL_PRODUCTS.find((p) => p.id === id);
  if (!isNew && cur?.usdt && patch.product.plans && samePrices(patch.product.plans, cur.plans)) delete patch.product.plans;
  const slug = patch.content?.slug;
  if (slug && Object.entries(CONTENT).some(([k, c]) => c.slug === slug && k !== id)) return fail("slug_taken");
  await saveProduct(patch);
  revalidatePath("/", "layout");
  return json({ ok: true });
}));

/** Drops the admin edits (a product added from the panel is removed). */
export const DELETE = route(async (_req: Request, { params }: Ctx) => withAdmin(async () => {
  const { id } = await params;
  await resetProduct(id);
  revalidatePath("/", "layout");
  return json({ ok: true });
}));
