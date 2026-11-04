import { ALL_PRODUCTS, optionLabel } from "@/lib/catalog";
import { loadCatalog } from "@/lib/server/catalog";
import { usdtRate } from "@/lib/server/crypto";
import { crConfigured, crWallet } from "@/lib/server/cryptorefills";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";
import { setSupplierMap, supplierBalance, supplierConfigured, supplierMap, supplierProducts } from "@/lib/server/supplier";

/** Supplier catalog with our cost in Toman, next to our own code products and their mapping. */
export const GET = route(async () => withAdmin(async () => {
  await loadCatalog();
  const ours = ALL_PRODUCTS.flatMap((p) => Object.entries(p.plans).filter(([, o]) => o?.code).map(([plan, o]) => ({ productId: p.id, plan, name: p.name, label: optionLabel(p, plan), price: o!.code! })));
  const [rate, map, cr] = await Promise.all([usdtRate(), supplierMap(), crWallet().catch((e) => ({ error: String((e as Error).message).slice(0, 160) }))]);
  const crInfo = { configured: crConfigured(), wallet: cr };
  if (!supplierConfigured()) return json({ configured: false, rate, ours, map, products: [], balance: null, cr: crInfo });
  try {
    const [products, balance] = await Promise.all([supplierProducts(), supplierBalance()]);
    return json({ configured: true, rate, ours, map, products, balance, test: process.env.INSIGHT_TEST_MODE === "1", cr: crInfo });
  } catch (e) {
    console.error(e);
    return json({ configured: true, rate, ours, map, products: [], balance: null, error: String((e as Error).message).slice(0, 200), cr: crInfo });
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
