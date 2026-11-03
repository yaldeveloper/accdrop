import { applyCatalog, type CatalogPatch } from "@/lib/catalog-sync";
import { db, dbUrl } from "./db";

const g = globalThis as unknown as { __acc_cat?: { at: number; data: CatalogPatch[] } };
const TTL = 15_000;

/** Loads admin product edits (cached briefly) and applies them to the in-memory catalog. Never throws. */
export async function loadCatalog(fresh = false): Promise<CatalogPatch[]> {
  if (!dbUrl()) return [];
  const c = g.__acc_cat;
  if (!fresh && c && Date.now() - c.at < TTL) { applyCatalog(c.data); return c.data; }
  try {
    const sql = await db();
    const rows = await sql`select id, data from products order by updated_at`;
    const data = rows.map((r) => ({ id: r.id as string, ...(r.data as Omit<CatalogPatch, "id">) }));
    g.__acc_cat = { at: Date.now(), data };
    applyCatalog(data);
    return data;
  } catch {
    return c?.data ?? [];
  }
}

export async function saveProduct(patch: CatalogPatch) {
  const sql = await db();
  const { id, ...data } = patch;
  await sql`insert into products (id, data) values (${id}, ${sql.json(data as never)})
    on conflict (id) do update set data = excluded.data, updated_at = now()`;
  return loadCatalog(true);
}

export async function resetProduct(id: string) {
  const sql = await db();
  await sql`delete from products where id = ${id}`;
  return loadCatalog(true);
}
