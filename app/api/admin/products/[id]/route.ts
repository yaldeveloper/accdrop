import { revalidatePath } from "next/cache";
import { ALL_PRODUCTS } from "@/lib/catalog";
import { CONTENT } from "@/lib/content";
import { loadCatalog, resetProduct, saveProduct } from "@/lib/server/catalog";
import { cleanPatch } from "@/lib/server/product-input";
import { minimalPatch } from "@/lib/catalog-sync";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };
/** Saves the edited state of a product (replaces any earlier edit). Only fields that differ from the code are stored,
 *  so later code changes to the other fields (new options, versions, prices) still reach the site. */
export const PUT = route(async (req: Request, { params }: Ctx) => withAdmin(async () => {
  const { id } = await params;
  const patches = await loadCatalog(true);
  const prev = patches.find((x) => x.id === id);
  if (!ALL_PRODUCTS.some((p) => p.id === id)) return fail("not_found", 404);
  const isNew = !!prev?.isNew;
  const full = cleanPatch(id, isNew, await body(req));
  if ("error" in full) return fail(full.error);
  const slug = full.content?.slug;
  if (slug && Object.entries(CONTENT).some(([k, c]) => c.slug === slug && k !== id)) return fail("slug_taken");
  const patch = minimalPatch(full);
  if (!patch.isNew && !Object.keys(patch.product).length && !Object.keys(patch.content ?? {}).length) await resetProduct(id);
  else await saveProduct(patch);
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
