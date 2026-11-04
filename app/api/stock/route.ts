import { NextResponse } from "next/server";
import { MAX_QTY, PRODUCTS } from "@/lib/catalog";
import { db, dbUrl } from "@/lib/server/db";
import { supplierConfigured, supplierMap } from "@/lib/server/supplier";

/** Units ready for instant delivery per option of a wholesale product, capped at MAX_QTY (the exact count stays private).
 *  `null` when there is no database or a supplier refills the product, so the page doesn't cap what it can't know. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const p = PRODUCTS.find((x) => x.id === id && x.bulk?.length);
  if (!p || !dbUrl()) return NextResponse.json({ stock: null });
  const supplied = Object.keys(p.qd ?? {}).length > 0 || Object.keys(p.cr ?? {}).length > 0 || Object.keys(p.cb ?? {}).length > 0
    || (supplierConfigured() && (await supplierMap()).some((m) => m.productId === p.id));
  if (supplied) return NextResponse.json({ stock: null });
  const sql = await db();
  const rows = await sql`select plan, least(count(*), ${MAX_QTY})::int as n from gift_codes
    where product_id = ${p.id} and line_id is null group by plan`;
  const stock = Object.fromEntries(Object.keys(p.plans).map((k) => [k, Number(rows.find((r) => r.plan === k)?.n ?? 0)]));
  return NextResponse.json({ stock }, { headers: { "cache-control": "public, max-age=20" } });
}
