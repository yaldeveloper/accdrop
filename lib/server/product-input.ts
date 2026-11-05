import { CATEGORIES, DELIVERY, MAX_QTY, MAX_SEATS, type Product } from "@/lib/catalog";
import type { ProductContent } from "@/lib/content";
import type { CatalogPatch } from "@/lib/catalog-sync";

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const KINDS = ["sub", "gift", "account", "qty", "number"];

/** Turns an admin form body into a safe catalog patch, or an error code. */
export function cleanPatch(id: string, isNew: boolean, b: { product?: Record<string, unknown>; content?: Record<string, unknown> }): CatalogPatch | { error: string } {
  if (!/^[a-z0-9-]{2,32}$/.test(id)) return { error: "bad_id" };
  const p = b.product ?? {};
  const out: Partial<Product> = {};
  for (const k of ["name", "maker", "description", "use", "badge", "axis", "monogram", "tier"] as const) {
    const v = str(p[k]);
    if (v !== undefined) out[k] = v;
  }
  if (isNew && !out.name) return { error: "bad_name" };
  if (p.category !== undefined) {
    if (!(typeof p.category === "string" && p.category in CATEGORIES && p.category !== "all")) return { error: "bad_category" };
    out.category = p.category as Product["category"];
  }
  if (isNew && !out.category) return { error: "bad_category" };
  if (p.kind !== undefined) { if (!KINDS.includes(String(p.kind))) return { error: "bad_kind" }; out.kind = p.kind as Product["kind"]; }
  if (p.etaMinutes !== undefined) out.etaMinutes = Math.max(0, Math.min(1440, Math.round(Number(p.etaMinutes) || 0)));
  if (p.includes !== undefined) out.includes = (Array.isArray(p.includes) ? p.includes : []).map((x) => str(x, 120)!).filter(Boolean).slice(0, 8);
  if (p.family !== undefined) {
    const fam = String(p.family ?? "").trim();
    if (fam && (fam === id || !/^[a-z0-9-]{2,32}$/.test(fam))) return { error: "bad_family" };
    out.family = fam || undefined;
  }
  if (p.hidden !== undefined) out.hidden = !!p.hidden;
  if (p.ip !== undefined) out.ip = !!p.ip;
  if (p.color !== undefined) out.color = /^#[0-9a-fA-F]{6}$/.test(String(p.color)) ? String(p.color) : undefined;
  if (p.labels !== undefined) {
    const l: Record<string, string> = {};
    for (const [k, v] of Object.entries((p.labels as Record<string, unknown>) ?? {})) if (/^[a-z0-9]{1,12}$/.test(k) && str(v, 40)) l[k] = str(v, 40)!;
    out.labels = l;
  }
  if (p.group !== undefined) {
    const g = (Array.isArray(p.group) ? p.group : [])
      .map((t) => [Math.round(Number((t as unknown[])[0])), Math.round(Number((t as unknown[])[1]))] as [number, number])
      .filter(([n, o]) => n >= 2 && n <= MAX_SEATS && o >= 0 && o <= 50)
      .sort((a, c) => a[0] - c[0]);
    out.group = g.length ? g : undefined;
  }
  if (p.bulk !== undefined) {
    const g = (Array.isArray(p.bulk) ? p.bulk : [])
      .map((t) => [Math.round(Number((t as unknown[])[0])), Math.round(Number((t as unknown[])[1]))] as [number, number])
      .filter(([n, o]) => n >= 2 && n <= MAX_QTY && o >= 0 && o <= 50)
      .sort((a, c) => a[0] - c[0]);
    out.bulk = g.length ? g : undefined;
  }
  if (p.plans !== undefined) {
    const plans: Product["plans"] = {};
    for (const [k, offers] of Object.entries((p.plans as Record<string, unknown>) ?? {})) {
      if (!/^[a-z0-9]{1,12}$/.test(k)) return { error: "bad_plan" };
      const o: Partial<Record<keyof typeof DELIVERY, number>> = {};
      for (const [t, v] of Object.entries((offers as Record<string, unknown>) ?? {})) {
        const n = Math.round(Number(v));
        if (t in DELIVERY && n > 0 && n < 1e10) o[t as keyof typeof DELIVERY] = n;
      }
      if (Object.keys(o).length) plans[k] = o;
    }
    if (!Object.keys(plans).length) return { error: "no_prices" };
    out.plans = plans;
  }
  if (isNew && !out.plans) return { error: "no_prices" };

  const c = b.content ?? {};
  const content: Partial<ProductContent> = {};
  if (c.slug !== undefined) {
    const s = String(c.slug).trim().toLowerCase();
    if (!/^[a-z0-9-]{2,48}$/.test(s)) return { error: "bad_slug" };
    content.slug = s;
  }
  for (const k of ["faName", "intro", "prefix", "keyword"] as const) {
    const v = str(c[k], 600);
    if (v) content[k] = v;
  }
  if (c.forWho !== undefined) content.forWho = (Array.isArray(c.forWho) ? c.forWho : []).map((x) => str(x, 80)!).filter(Boolean).slice(0, 6);
  return { id, isNew: isNew || undefined, product: out, content: Object.keys(content).length ? content : undefined };
}
