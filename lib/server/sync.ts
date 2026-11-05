// Automatic supplier sync: reads every supplier's price list and stock and records, per option we buy automatically,
// what it costs now and whether it can be delivered. lib/catalog-sync.ts turns that into live selling prices (the margin
// over cost stays the same) and closes options the supplier can't deliver. It also remembers every product the
// suppliers offer, so the admin panel can list ones the store does not sell yet.
//
// Runs from the Vercel cron (/api/cron/sync), from «همگام‌سازی الان» in the admin panel, and on its own after a page
// is served when the last run is older than SYNC_EVERY_MINUTES (default 20). Runs never overlap.
import { ALL_PRODUCTS } from "@/lib/catalog";
import { MAX_DROP, MAX_RISE, codeProduct, costRatio, slotPrice, type SupplyState } from "@/lib/catalog-sync";
import { cbConfigured, cbProducts } from "./canboso";
import { db, dbUrl } from "./db";
import { qdConfigured, qdProducts } from "./quickdigi";
import { supplierConfigured, supplierMap, supplierProducts } from "./supplier";

export const syncEvery = () => Math.max(5, Number(process.env.SYNC_EVERY_MINUTES) || 20);

type Src = "ix" | "qd" | "cb";
type Slot = { productId: string; plan: string; src: Src; extId: string };
type Ext = { id: string; name: string; cost: number | null; available: boolean; stock: number | null; note?: string };

export type SyncChange = { productId: string; plan: string; kind: "price" | "out" | "back" | "jump"; from?: number; to?: number };
export type SyncSummary = { at: string; checked: number; out: number; changes: SyncChange[]; errors: string[]; newAtSuppliers: number };

/** Options bought automatically, with the supplier that actually fills them (same order as supplyLine). */
async function slots(): Promise<Slot[]> {
  const out: Slot[] = [];
  const taken = new Set<string>();
  for (const p of ALL_PRODUCTS) {
    const c = codeProduct(p.id);
    if (!c) continue;
    for (const k of Object.keys(c.plans)) {
      if (!("code" in (c.plans[k] ?? {})) || c.cr?.[k]) continue;
      const qd = c.qd?.[k], cb = c.cb?.[k];
      if (qd) out.push({ productId: c.id, plan: k, src: "qd", extId: qd.id });
      else if (cb) out.push({ productId: c.id, plan: k, src: "cb", extId: cb.id });
      else continue;
      taken.add(`${c.id}|${k}`);
    }
  }
  if (supplierConfigured()) for (const m of await supplierMap()) {
    const c = codeProduct(m.productId);
    if (!c || !("code" in (c.plans[m.plan] ?? {})) || c.cr?.[m.plan] || taken.has(`${m.productId}|${m.plan}`)) continue;
    out.push({ productId: m.productId, plan: m.plan, src: "ix", extId: String(m.supplierId) });
  }
  return out;
}

/** Every supplier's price list in one shape; null for a supplier that is not set up or did not answer. */
async function lists(errors: string[]): Promise<Record<Src, Ext[] | null>> {
  const guard = async (src: Src, f: () => Promise<Ext[]>) => {
    try { return await f(); } catch (e) { errors.push(`${src}: ${String((e as Error).message).slice(0, 160)}`); return null; }
  };
  const [ix, qd, cb] = await Promise.all([
    supplierConfigured() ? guard("ix", async () => (await supplierProducts()).map((p) => ({
      id: String(p.id), name: p.name, cost: p.cost || null, available: p.available, stock: p.unlimited ? null : p.stock }))) : null,
    qdConfigured() ? guard("qd", async () => (await qdProducts()).map((p) => ({
      // QuickDigi fills orders automatically only below 15 USDT.
      id: p.id, name: p.name, cost: p.price || null, available: p.available && (p.stock === null || p.stock > 0) && p.price < 15, stock: p.stock,
      note: p.price >= 15 ? "over_15" : undefined }))) : null,
    cbConfigured() ? guard("cb", async () => (await cbProducts()).map((p) => ({
      id: p.id, name: p.name, cost: p.currency === "USD" && p.price > 0 ? p.price : null,
      available: p.type === "account" && p.currency === "USD" && p.price > 0 && (p.available === null || p.available > 0), stock: p.available }))) : null,
  ]);
  return { ix, qd, cb };
}

/** One sync run. Returns null when there is no database or another run started less than `minGap` minutes ago. */
export async function runSync(trigger: string, minGap = syncEvery()): Promise<SyncSummary | null> {
  if (!dbUrl()) return null;
  const sql = await db();
  const claimed = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(731107)`;
    return tx`insert into sync_runs (trigger) select ${trigger}
      where not exists (select 1 from sync_runs where started_at > now() - make_interval(mins => ${minGap})
        or (finished_at is null and started_at > now() - interval '5 minutes'))
      returning id`;
  });
  const runId = claimed[0]?.id as number | undefined;
  if (!runId) return null;

  const errors: string[] = [];
  const changes: SyncChange[] = [];
  let summary: SyncSummary = { at: new Date().toISOString(), checked: 0, out: 0, changes, errors, newAtSuppliers: 0 };
  try {
    const all = await slots();
    const ext = await lists(errors);
    const own = new Map((await sql`select product_id, plan, count(*)::int as n from gift_codes where line_id is null group by 1, 2`)
      .map((r) => [`${r.product_id}|${r.plan}`, Number(r.n)]));
    const prev = new Map((await sql`select product_id, plan, src, ext_id, cost, available, state from supplier_stock`)
      .map((r) => [`${r.product_id}|${r.plan}`, r]));

    // A list that lacks most of the products we buy from that supplier is treated as a bad answer, not as everything
    // being sold out: the last known state stays.
    for (const src of ["ix", "qd", "cb"] as Src[]) {
      const list = ext[src];
      const ours = all.filter((s) => s.src === src);
      if (!list || !ours.length) continue;
      const missing = ours.filter((s) => !list.some((x) => x.id === s.extId)).length;
      if (!list.length || (ours.length >= 4 && missing > ours.length / 2)) { errors.push(`${src}: list is missing ${missing} of ${ours.length} products, ignored`); ext[src] = null; }
    }

    const keep: string[] = [];
    for (const s of all) {
      const key = `${s.productId}|${s.plan}`;
      const list = ext[s.src];
      if (!list) { keep.push(key); continue; } // supplier unreachable: keep the last known state
      const code = codeProduct(s.productId)!;
      const e = list.find((x) => x.id === s.extId);
      const cost = e?.cost ?? null;
      const available = !!e?.available;
      const out = !available && (own.get(key) ?? 0) < 1;
      const old = prev.get(key);
      const same = old && old.src === s.src && old.ext_id === s.extId;
      const oldState = (same ? old.state : null) as SupplyState[string][string] | null;
      const state: SupplyState[string][string] = {};
      if (cost) state.c = cost;
      if (out) state.o = 1;
      if (s.src === "ix" && cost) {
        // Insight Store costs are not in code: the first cost seen is the one today's selling price was set for.
        // A new selling price in code starts over from the cost at that moment.
        const price = slotPrice(code, s.plan);
        const kept = oldState?.b && oldState.p === price;
        state.b = kept ? oldState!.b : cost;
        state.p = price;
      }
      summary.checked++;
      if (out) summary.out++;
      const r = costRatio(code, s.plan, state);
      const oldCost = same && old.cost !== null ? Number(old.cost) : null;
      if (same && Boolean(old.available) !== available) changes.push({ productId: s.productId, plan: s.plan, kind: available ? "back" : "out" });
      if (cost && oldCost && Math.abs(cost - oldCost) >= 0.01) changes.push({ productId: s.productId, plan: s.plan, kind: r > MAX_RISE || r < MAX_DROP ? "jump" : "price", from: oldCost, to: cost });
      const changed = !same || Boolean(old.available) !== available || JSON.stringify(oldState) !== JSON.stringify(state);
      await sql`insert into supplier_stock (product_id, plan, src, ext_id, cost, available, stock, note, state, checked_at, changed_at)
        values (${s.productId}, ${s.plan}, ${s.src}, ${s.extId}, ${cost}, ${available}, ${e?.stock ?? null}, ${e ? e.note ?? null : "missing"}, ${sql.json(state as never)}, now(), now())
        on conflict (product_id, plan) do update set src = excluded.src, ext_id = excluded.ext_id, cost = excluded.cost, available = excluded.available,
          stock = excluded.stock, note = excluded.note, state = excluded.state, checked_at = now(),
          changed_at = case when ${changed} then now() else supplier_stock.changed_at end`;
      keep.push(key);
    }
    // Options no longer bought automatically.
    for (const key of prev.keys()) if (!keep.includes(key)) {
      const [productId, plan] = key.split("|");
      await sql`delete from supplier_stock where product_id = ${productId} and plan = ${plan}`;
    }

    // Everything the suppliers sell, to spot new products.
    for (const src of ["ix", "qd", "cb"] as Src[]) {
      const list = ext[src];
      if (!list?.length) continue;
      const rows = list.map((x) => ({ src, ext_id: x.id, name: x.name.slice(0, 200), cost: x.cost, available: x.available }));
      for (let i = 0; i < rows.length; i += 200) {
        await sql`insert into supplier_seen ${sql(rows.slice(i, i + 200), "src", "ext_id", "name", "cost", "available")}
          on conflict (src, ext_id) do update set name = excluded.name, cost = excluded.cost, available = excluded.available, last_seen = now()`;
      }
    }
    summary.newAtSuppliers = (await newAtSuppliers(all)).length;
  } catch (e) {
    errors.push(String((e as Error).message).slice(0, 200));
  } finally {
    summary = { ...summary, at: new Date().toISOString() };
    await sql`update sync_runs set finished_at = now(), summary = ${sql.json(summary as never)} where id = ${runId}`.catch(() => {});
    await sql`delete from sync_runs where id < ${runId - 500}`.catch(() => {});
  }
  const { dropCatalogCache } = await import("./catalog");
  dropCatalogCache();
  return summary;
}

/** The supplier state the catalog applies (see lib/catalog-sync.ts). */
export async function supplyState(): Promise<{ state: SupplyState; lastRun: number }> {
  const sql = await db();
  const [rows, [run]] = await Promise.all([
    sql`select product_id, plan, state from supplier_stock`,
    sql`select extract(epoch from max(started_at))::float8 * 1000 as at from sync_runs`,
  ]);
  const state: SupplyState = {};
  for (const r of rows) if (r.state) (state[r.product_id] ??= {})[r.plan] = r.state as SupplyState[string][string];
  return { state, lastRun: Number(run?.at ?? 0) };
}

/** Products a supplier started selling in the last 14 days that the store does not sell. */
async function newAtSuppliers(mapped?: Slot[]) {
  const sql = await db();
  const used = new Set((mapped ?? await slots()).map((s) => `${s.src}|${s.extId}`));
  const rows = await sql`select src, ext_id, name, cost, available, first_seen from supplier_seen
    where first_seen > now() - interval '14 days' and last_seen > now() - interval '2 days'
      and first_seen > (select min(first_seen) + interval '1 hour' from supplier_seen s2 where s2.src = supplier_seen.src)
    order by first_seen desc limit 100`;
  return rows.filter((r) => !used.has(`${r.src}|${r.ext_id}`)).map((r) => ({
    src: r.src as Src, id: r.ext_id as string, name: r.name as string, cost: r.cost === null ? null : Number(r.cost), available: !!r.available, since: (r.first_seen as Date).toISOString(),
  }));
}

/** Admin view: recent runs, every option bought automatically with its state, and new supplier products. */
export async function syncReport() {
  const sql = await db();
  const [runs, rows, fresh] = await Promise.all([
    sql`select id, trigger, started_at, finished_at, summary from sync_runs order by id desc limit 10`,
    sql`select product_id, plan, src, ext_id, cost, available, stock, note, state, checked_at, changed_at from supplier_stock order by product_id, plan`,
    newAtSuppliers(),
  ]);
  return {
    every: syncEvery(),
    runs: runs.map((r) => ({ id: r.id, trigger: r.trigger, startedAt: r.started_at, finishedAt: r.finished_at, summary: r.summary as SyncSummary | null })),
    options: rows.map((r) => {
      const code = codeProduct(r.product_id);
      const state = (r.state ?? {}) as SupplyState[string][string];
      const ratio = code ? costRatio(code, r.plan, state) : 1;
      return {
        productId: r.product_id as string, plan: r.plan as string, name: code?.name ?? r.product_id, src: r.src as Src, extId: r.ext_id as string,
        cost: r.cost === null ? null : Number(r.cost), available: !!r.available, stock: r.stock === null ? null : Number(r.stock), note: r.note as string | null,
        out: !!state.o || ratio > MAX_RISE, ratio, held: ratio > MAX_RISE || ratio < MAX_DROP, changedAt: r.changed_at,
      };
    }),
    fresh,
  };
}
