import { after } from "next/server";
import { applyCatalog, type CatalogPatch, type SupplyState } from "@/lib/catalog-sync";
import { usdtRate } from "./crypto";
import { db, dbUrl } from "./db";

type Cached = { at: number; data: CatalogPatch[]; supply: SupplyState; lastRun: number };
const g = globalThis as unknown as { __acc_cat?: Cached; __acc_sync_kick?: number };
const TTL = 15_000;

let rate = 0;
let supply: SupplyState = {};
/** The Tether rate the catalog was last priced at (passed to the browser so both sides show the same prices). */
export const catalogRate = () => rate;
/** The supplier prices and stock the catalog was last built with (passed to the browser too). */
export const catalogSupply = () => supply;
/** Makes the next loadCatalog read the database again (after a supplier sync). */
export const dropCatalogCache = () => { g.__acc_cat = undefined; };

/** Starts a supplier sync after this request when the last one is older than SYNC_EVERY_MINUTES. Never during a build. */
async function kickSync(lastRun: number) {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { runSync, syncEvery } = await import("./sync");
  const now = Date.now();
  if (now - lastRun < syncEvery() * 60_000 || now - (g.__acc_sync_kick ?? 0) < 60_000) return;
  g.__acc_sync_kick = now;
  const job = () => runSync("visit").then(() => undefined).catch((e) => console.error("sync", e));
  try { after(job); } catch { void job(); }
}

/** Loads admin product edits and the supplier sync (cached briefly), reprices USDT-priced products at the live Tether
 *  rate (Nobitex, then Wallex, cached 5 minutes) and applies them to the in-memory catalog. Never throws. */
export async function loadCatalog(fresh = false): Promise<CatalogPatch[]> {
  rate = await usdtRate().then((r) => r.rate).catch(() => rate);
  if (!dbUrl()) { applyCatalog([], rate); return []; }
  const c = g.__acc_cat;
  if (!fresh && c && Date.now() - c.at < TTL) { supply = c.supply; applyCatalog(c.data, rate, supply); return c.data; }
  try {
    const sql = await db();
    const { supplyState } = await import("./sync");
    const [rows, s] = await Promise.all([sql`select id, data from products order by updated_at`, supplyState().catch(() => ({ state: c?.supply ?? {}, lastRun: Date.now() }))]);
    const data = rows.map((r) => ({ id: r.id as string, ...(r.data as Omit<CatalogPatch, "id">) }));
    g.__acc_cat = { at: Date.now(), data, supply: s.state, lastRun: s.lastRun };
    supply = s.state;
    applyCatalog(data, rate, supply);
    await kickSync(s.lastRun).catch(() => {});
    // Gift cards scheduled for a later time go out on the next visit after it (and from /api/cron/gifts).
    await import("./gifts").then((m) => m.kickGiftDelivery()).catch(() => {});
    return data;
  } catch {
    supply = c?.supply ?? {};
    applyCatalog(c?.data ?? [], rate, supply);
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
