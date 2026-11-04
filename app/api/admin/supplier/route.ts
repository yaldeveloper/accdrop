import { ALL_PRODUCTS, optionLabel } from "@/lib/catalog";
import { loadCatalog } from "@/lib/server/catalog";
import { usdtRate } from "@/lib/server/crypto";
import { crConfigured, crWallet } from "@/lib/server/cryptorefills";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";
import { fivesimBalance, fivesimConfigured, fivesimSettings, liveOffers } from "@/lib/server/fivesim";
import { qdBalance, qdConfigured } from "@/lib/server/quickdigi";
import { cbBalance, cbConfigured } from "@/lib/server/canboso";
import { setSupplierMap, supplierBalance, supplierConfigured, supplierMap, supplierProducts } from "@/lib/server/supplier";

/** Supplier catalog with our cost in Toman, next to our own code products and their mapping. */
export const GET = route(async () => withAdmin(async () => {
  await loadCatalog();
  const ours = ALL_PRODUCTS.flatMap((p) => Object.entries(p.plans).filter(([, o]) => o?.code).map(([plan, o]) => ({ productId: p.id, plan, name: p.name, label: optionLabel(p, plan), price: o!.code! })));
  const [rate, map, cr, fivesim] = await Promise.all([usdtRate(), supplierMap(), crWallet().catch((e) => ({ error: String((e as Error).message).slice(0, 160) })), fivesimInfo()]);
  const crInfo = { configured: crConfigured(), wallet: cr };
  const qd = { configured: qdConfigured(), balance: qdConfigured() ? await qdBalance().catch((e) => ({ error: String((e as Error).message).slice(0, 160) })) : null };
  const cb = { configured: cbConfigured(), balance: cbConfigured() ? await cbBalance().catch((e) => ({ error: String((e as Error).message).slice(0, 160) })) : null };
  if (!supplierConfigured()) return json({ configured: false, rate, ours, map, products: [], balance: null, cr: crInfo, qd, cb, fivesim });
  try {
    const [products, balance] = await Promise.all([supplierProducts(), supplierBalance()]);
    return json({ configured: true, rate, ours, map, products, balance, test: process.env.INSIGHT_TEST_MODE === "1", cr: crInfo, qd, cb, fivesim });
  } catch (e) {
    console.error(e);
    return json({ configured: true, rate, ours, map, products: [], balance: null, error: String((e as Error).message).slice(0, 200), cr: crInfo, qd, cb, fivesim });
  }
}));

export const POST = route(async (req: Request) => withAdmin(async () => {
  const b = await body<{ productId: string; plan: string; supplierId: number | null }>(req);
  await loadCatalog();
  const p = ALL_PRODUCTS.find((x) => x.id === b.productId);
  if (!p || !b.plan || !p.plans[b.plan]?.code) return fail("bad_item");
  await setSupplierMap(p.id, b.plan, b.supplierId ? Math.trunc(Number(b.supplierId)) : null);
  return json({ map: await supplierMap() });
}));

/** 5sim (virtual numbers): balance, pricing settings and a sample of today's Telegram prices. */
async function fivesimInfo() {
  const settings = fivesimSettings();
  if (!fivesimConfigured()) return { configured: false, ...settings };
  const [balance, sample] = await Promise.all([
    fivesimBalance().catch((e) => String((e as Error).message).slice(0, 200)),
    liveOffers("telegram").then((o) => o.slice(0, 6)).catch(() => []),
  ]);
  return { configured: true, ...settings, balance: typeof balance === "number" ? balance : null, error: typeof balance === "string" ? balance : undefined, sample };
}
