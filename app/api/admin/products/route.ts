import { revalidatePath } from "next/cache";
import { ALL_PRODUCTS } from "@/lib/catalog";
import { CONTENT } from "@/lib/content";
import { loadCatalog, saveProduct } from "@/lib/server/catalog";
import { cleanPatch } from "@/lib/server/product-input";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";

const snapshot = async (fresh = false) => {
  const patches = await loadCatalog(fresh);
  return { products: ALL_PRODUCTS, content: CONTENT, edited: patches.map((x) => x.id), added: patches.filter((x) => x.isNew).map((x) => x.id) };
};

export const GET = route(async () => withAdmin(async () => json(await snapshot(true))));

/** Creates a new product. */
export const POST = route(async (req: Request) => withAdmin(async () => {
  const b = await body<{ id: string; product: Record<string, unknown>; content: Record<string, unknown> }>(req);
  const id = String(b.id ?? "").trim().toLowerCase();
  await loadCatalog(true);
  if (ALL_PRODUCTS.some((p) => p.id === id)) return fail("exists");
  const patch = cleanPatch(id, true, b);
  if ("error" in patch) return fail(patch.error);
  const slug = patch.content?.slug ?? id;
  if (Object.entries(CONTENT).some(([k, c]) => c.slug === slug && k !== id)) return fail("slug_taken");
  patch.content = { ...patch.content, slug };
  await saveProduct(patch);
  revalidatePath("/", "layout");
  return json(await snapshot());
}));
