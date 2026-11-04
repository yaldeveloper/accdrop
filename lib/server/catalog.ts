import { applyCatalog, type CatalogPatch } from "@/lib/catalog-sync";
import { usdtRate } from "./crypto";
import { db, dbUrl } from "./db";

const g = globalThis as unknown as { __acc_cat?: { at: number; data: CatalogPatch[] } };
const TTL = 15_000;

let rate = 0;
/** The Tether rate the catalog was last priced at (passed to the browser so both sides show the same prices). */
export const catalogRate = () => rate;

/** Loads admin product edits (cached briefly), reprices USDT-priced products at the live Tether rate (Nobitex, then
 *  Wallex, cached 5 minutes) and applies both to the in-memory catalog. Never throws. */
export async function loadCatalog(fresh = false): Promise<CatalogPatch[]> {
  rate = await usdtRate().then((r) => r.rate).catch(() => rate);
  if (!dbUrl()) { applyCatalog([], rate); return []; }
  const c = g.__acc_cat;
  if (!fresh && c && Date.now() - c.at < TTL) { applyCatalog(c.data, rate); return c.data; }
  try {
    const sql = await db();
    const rows = await sql`select id, data from products order by updated_at`;
    const data = rows.map((r) => ({ id: r.id as string, ...(r.data as Omit<CatalogPatch, "id">) }));
    g.__acc_cat = { at: Date.now(), data };
    applyCatalog(data, rate);
    return data;
  } catch {
    applyCatalog(c?.data ?? [], rate);
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
