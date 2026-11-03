import { revalidatePath } from "next/cache";
import { ALL_PRODUCTS } from "@/lib/catalog";
import { CONTENT } from "@/lib/content";
import { loadCatalog, resetProduct, saveProduct } from "@/lib/server/catalog";
import { cleanPatch } from "@/lib/server/product-input";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

/** Saves the full edited state of a product (replaces any earlier edit). */
export const PUT = route(async (req: Request, { params }: Ctx) => withAdmin(async () => {
  const { id } = await params;
  const patches = await loadCatalog(true);
  const prev = patches.find((x) => x.id === id);
  if (!ALL_PRODUCTS.some((p) => p.id === id)) return fail("not_found", 404);
  const isNew = !!prev?.isNew;
  const patch = cleanPatch(id, isNew, await body(req));
  if ("error" in patch) return fail(patch.error);
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
