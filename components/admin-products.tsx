"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, DELIVERY, MAX_SEATS, minPrice, type Category, type DeliveryType, type Product, type ProductKind } from "@/lib/catalog";
import type { ProductContent } from "@/lib/content";
import { duration, fa, money } from "@/lib/format";
import { api } from "./account";
import { BrandLogo, Icon } from "./brand";
import { useStore } from "./store";

type Snapshot = { products: Product[]; content: Record<string, ProductContent>; edited: string[]; added: string[] };

const KIND: Record<ProductKind, string> = { sub: "اشتراک ماهانه", gift: "گیفت‌کارت", account: "اکانت آماده", qty: "تعدادی (استارز…)", number: "شماره مجازی" };
const TYPES = Object.keys(DELIVERY) as DeliveryType[];
const ERR: Record<string, string> = {
  bad_id: "شناسه فقط حروف کوچک انگلیسی، عدد و خط تیره (۲ تا ۳۲ حرف)",
  exists: "محصولی با این شناسه هست", bad_name: "نام محصول را بنویس", bad_category: "دسته را انتخاب کن",
  no_prices: "حداقل یک قیمت وارد کن", bad_plan: "کلید گزینه‌ها فقط حروف انگلیسی و عدد", bad_slug: "آدرس صفحه فقط حروف انگلیسی، عدد و خط تیره",
  slug_taken: "این آدرس صفحه برای محصول دیگری است", bad_family: "محصول اصلی درست انتخاب نشده",
};

function useCatalog() {
  const [data, setData] = useState<Snapshot | null>(null);
  const load = async () => { const r = await api<Snapshot>("/api/admin/products"); if (!r.error) setData(r); };
  useEffect(() => { load(); }, []);
  return { data, reload: load };
}

// ----- List -----
export function AdminProducts() {
  const { data } = useCatalog();
  const [q, setQ] = useState(""), [cat, setCat] = useState<"all" | Category>("all");
  const rows = useMemo(() => (data?.products ?? []).filter((p) =>
    (cat === "all" || p.category === cat) && (!q || `${p.name} ${p.maker} ${p.id}`.toLowerCase().includes(q.toLowerCase()))), [data, q, cat]);
  return (
    <>
      <header className="dash-h ap-h">
        <div><h1>محصولات</h1><p className="muted">{data ? `${fa(data.products.length)} محصول • ${fa(data.products.filter((p) => p.hidden).length)} مخفی` : ""}</p></div>
        <Link className="btn btn-paper" href="/admin/products/new">+ محصول جدید</Link>
      </header>
      <div className="adm-bar">
        <input className="adm-in" placeholder="جست‌وجوی نام یا سازنده" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="ap-cats">{(Object.keys(CATEGORIES) as ("all" | Category)[]).map((c) => (
          <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{CATEGORIES[c]}</button>
        ))}</div>
      </div>
      {!data ? <p className="muted">…</p> : (
        <div className="ap-list">{rows.map((p) => (
          <Link key={p.id} href={`/admin/products/${p.id}`} className={`ap-row ${p.hidden ? "adm-off" : ""}`}>
            <span className="ap-logo" style={{ color: p.color }}><BrandLogo id={p.id} size={22} /></span>
            <span className="ap-n"><b className="en">{p.name}</b><small className="muted">{CATEGORIES[p.category]} • {KIND[p.kind ?? "sub"]}</small></span>
            <span className="ap-tags">
              {p.badge && <i className="ap-tag lime">{p.badge}</i>}
              {p.group?.length ? <i className="ap-tag">گروهی</i> : null}
              {p.ip ? <i className="ap-tag">آی‌پی</i> : null}
              {p.hidden && <i className="ap-tag warn">مخفی</i>}
              {data.added.includes(p.id) ? <i className="ap-tag">جدید</i> : data.edited.includes(p.id) ? <i className="ap-tag">ویرایش‌شده</i> : null}
            </span>
            <span className="ap-p num">از {money(minPrice(p))}</span>
            <Icon id="arrow" className="arrow" />
          </Link>
        ))}</div>
      )}
    </>
  );
}

// ----- Editor -----
type Row = { key: string; label: string; prices: Partial<Record<DeliveryType, string>> };
type Draft = {
  id: string; name: string; maker: string; category: Category; kind: ProductKind; axis: string; description: string; use: string;
  etaMinutes: string; includes: string; badge: string; family: string; tier: string; color: string; hidden: boolean; ip: boolean;
  groupOn: boolean; group: [string, string][]; types: DeliveryType[]; rows: Row[];
  slug: string; faName: string; intro: string; forWho: string;
};

const BLANK: Draft = {
  id: "", name: "", maker: "", category: "ai", kind: "sub", axis: "", description: "", use: "", etaMinutes: "15", includes: "",
  badge: "", family: "", tier: "", color: "", hidden: false, ip: false, groupOn: false, group: [["2", "5"], ["3", "8"], ["5", "12"]], types: ["own"],
  rows: [{ key: "1", label: "", prices: {} }, { key: "12", label: "", prices: {} }], slug: "", faName: "", intro: "", forWho: "",
};

function toDraft(p: Product, c?: ProductContent): Draft {
  const keys = Object.keys(p.plans);
  const types = TYPES.filter((t) => keys.some((k) => p.plans[k]?.[t]));
  return {
    id: p.id, name: p.name, maker: p.maker, category: p.category, kind: p.kind ?? "sub", axis: p.axis ?? "", description: p.description, use: p.use,
    etaMinutes: String(p.etaMinutes), includes: p.includes.join("\n"), badge: p.badge ?? "", family: p.family ?? "", tier: p.tier ?? "", color: p.color ?? "", hidden: !!p.hidden, ip: !!p.ip,
    groupOn: !!p.group?.length, group: (p.group?.length ? p.group : BLANK.group.map(([a, b]) => [Number(a), Number(b)])).map(([a, b]) => [String(a), String(b)]),
    types, rows: keys.map((k) => ({ key: k, label: p.labels?.[k] ?? "", prices: Object.fromEntries(types.map((t) => [t, p.plans[k]?.[t] ? String(p.plans[k]![t]) : ""])) })),
    slug: c?.slug ?? "", faName: c?.faName ?? "", intro: c?.intro ?? "", forWho: (c?.forWho ?? []).join("\n"),
  };
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const digits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");

function toBody(d: Draft) {
  const plans: Record<string, Record<string, number>> = {};
  const labels: Record<string, string> = {};
  for (const r of d.rows) {
    const k = r.key.trim().toLowerCase();
    if (!k) continue;
    const o: Record<string, number> = {};
    for (const t of d.types) { const n = Number(digits(r.prices[t] ?? "")); if (n > 0) o[t] = n; }
    if (Object.keys(o).length) plans[k] = o;
    if (r.label.trim()) labels[k] = r.label.trim();
  }
  return {
    id: d.id.trim().toLowerCase(),
    product: {
      name: d.name, maker: d.maker, category: d.category, kind: d.kind, axis: d.axis, description: d.description, use: d.use,
      etaMinutes: Number(digits(d.etaMinutes)) || 0, includes: lines(d.includes), badge: d.badge, family: d.family, tier: d.tier, color: d.color || undefined,
      hidden: d.hidden, ip: d.ip, labels, plans, group: d.groupOn ? d.group.map(([a, b]) => [Number(digits(a)), Number(digits(b))]) : [],
    },
    content: { slug: d.slug || undefined, faName: d.faName, intro: d.intro, forWho: lines(d.forWho) },
  };
}

export function AdminProduct({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const { notify } = useStore();
  const { data, reload } = useCatalog();
  const [d, setD] = useState<Draft | null>(isNew ? BLANK : null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const product = data?.products.find((p) => p.id === id);
  useEffect(() => { if (!isNew && product && !d) setD(toDraft(product, data?.content[id])); }, [isNew, product, d, data, id]);

  if (!d) return <p className="muted">{data && !product ? "این محصول پیدا نشد." : "…"}</p>;
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch });
  const setRow = (i: number, patch: Partial<Row>) => set({ rows: d.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const isSub = d.kind === "sub";
  const edited = data?.edited.includes(id);

  const save = async () => {
    setSaving(true); setErr("");
    const b = toBody(d);
    const r = isNew
      ? await api("/api/admin/products", { body: b })
      : await api(`/api/admin/products/${id}`, { method: "PUT", body: b });
    setSaving(false);
    if (r.error) { setErr(ERR[r.error] ?? "ذخیره نشد"); return; }
    notify("ذخیره شد؛ تا چند ثانیه دیگر روی سایت است");
    if (isNew) router.replace(`/admin/products/${b.id}`); else reload();
  };
  const reset = async () => {
    if (!confirm(data?.added.includes(id) ? "این محصول حذف شود؟" : "همه تغییرات این محصول پاک شود و به حالت اولیه برگردد؟")) return;
    await api(`/api/admin/products/${id}`, { method: "DELETE" });
    notify("انجام شد");
    if (data?.added.includes(id)) router.replace("/admin/products"); else { setD(null); reload(); }
  };

  const preview = (() => {
    const b = toBody(d).product;
    const all = Object.values(b.plans).flatMap((o) => Object.values(o));
    return { min: all.length ? Math.min(...all) : 0 };
  })();

  return (
    <>
      <nav className="crumbs" aria-label="مسیر"><Link href="/admin/products">محصولات</Link><span>/</span><span className="en">{isNew ? "جدید" : d.name}</span></nav>
      <header className="dash-h ap-h">
        <div><h1>{isNew ? "محصول جدید" : d.name}</h1><p className="muted">{isNew ? "بعد از ذخیره، صفحه محصول و کارت‌ها خودکار ساخته می‌شوند." : edited ? "این محصول در پنل ویرایش شده است." : "مقادیر پیش‌فرض کد؛ هر تغییری اینجا جایگزین آن می‌شود."}</p></div>
        {!isNew && <a className="btn btn-ghost" href={`/${d.slug}`} target="_blank" rel="noreferrer">دیدن صفحه</a>}
      </header>

      <div className="ap-g">
        <div className="ap-form">
          <section className="dash-sec ap-sec">
            <h2>اطلاعات اصلی</h2>
            <div className="ap-2">
              {isNew && <Field label="شناسه (انگلیسی، یکتا)"><input className="adm-in ltr" value={d.id} placeholder="midjourney" onChange={(e) => set({ id: e.target.value, slug: d.slug || "" })} /></Field>}
              <Field label="نام محصول"><input className="adm-in ltr" value={d.name} placeholder="Midjourney Pro" onChange={(e) => set({ name: e.target.value })} /></Field>
              <Field label="سازنده"><input className="adm-in ltr" value={d.maker} onChange={(e) => set({ maker: e.target.value })} /></Field>
              <Field label="دسته"><select className="adm-in" value={d.category} onChange={(e) => set({ category: e.target.value as Category })}>
                {(Object.keys(CATEGORIES) as Category[]).filter((c) => (c as string) !== "all").map((c) => <option key={c} value={c}>{CATEGORIES[c]}</option>)}
              </select></Field>
              <Field label="نوع"><select className="adm-in" value={d.kind} onChange={(e) => set({ kind: e.target.value as ProductKind })}>
                {(Object.keys(KIND) as ProductKind[]).map((k) => <option key={k} value={k}>{KIND[k]}</option>)}
              </select></Field>
              <Field label="زمان تحویل (دقیقه، ۰ = خودکار)"><input className="adm-in num" inputMode="numeric" value={d.etaMinutes} onChange={(e) => set({ etaMinutes: e.target.value })} /></Field>
            </div>
            <div className="ap-2">
              <Field label="نسخه‌ای از (برای Go / Pro / Max)"><select className="adm-in" value={d.family} onChange={(e) => set({ family: e.target.value })}>
                <option value="">— محصول مستقل —</option>
                {(data?.products ?? []).filter((x) => !x.family && x.id !== id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select></Field>
              <Field label="نام نسخه (مثلاً Pro)"><input className="adm-in ltr" value={d.tier} placeholder="Plus" onChange={(e) => set({ tier: e.target.value })} /></Field>
            </div>
            <Field label="توضیح کوتاه (روی کارت‌ها)"><input className="adm-in" value={d.description} onChange={(e) => set({ description: e.target.value })} /></Field>
            <Field label="به درد چه کاری می‌خورد (یک خط)"><input className="adm-in" value={d.use} onChange={(e) => set({ use: e.target.value })} /></Field>
            <Field label="امکانات (هر خط یکی)"><textarea rows={4} value={d.includes} onChange={(e) => set({ includes: e.target.value })} /></Field>
          </section>

          <section className="dash-sec ap-sec">
            <h2>قیمت‌ها و گزینه‌ها</h2>
            <div className="ap-types">
              <span className="muted">روش‌های تحویل:</span>
              {TYPES.map((t) => (
                <label key={t} className={`ap-chk ${d.types.includes(t) ? "on" : ""}`}>
                  <input type="checkbox" checked={d.types.includes(t)} onChange={(e) => set({ types: e.target.checked ? [...d.types, t] : d.types.filter((x) => x !== t) })} />{DELIVERY[t].title}
                </label>
              ))}
            </div>
            {!isSub && <Field label="عنوان انتخاب (مثلاً «مبلغ کارت» یا «کشور»)"><input className="adm-in" value={d.axis} onChange={(e) => set({ axis: e.target.value })} /></Field>}
            <div className="ap-plans" style={{ "--c": d.types.length } as CSSProperties}>
              <div className="ap-pr ap-ph"><span>{isSub ? "مدت (ماه)" : "کلید"}</span><span>{isSub ? "نمایش" : "نام نمایشی"}</span>{d.types.map((t) => <span key={t}>{DELIVERY[t].title} (تومان)</span>)}<span /></div>
              {d.rows.map((r, i) => (
                <div className="ap-pr" key={i}>
                  <input className="adm-in ltr" value={r.key} onChange={(e) => setRow(i, { key: e.target.value })} aria-label="کلید" />
                  {isSub ? <span className="muted ap-lbl">{/^\d+$/.test(r.key) ? duration(r.key) : "—"}</span>
                    : <input className="adm-in" value={r.label} placeholder="۱۰ دلار" onChange={(e) => setRow(i, { label: e.target.value })} aria-label="نام نمایشی" />}
                  {d.types.map((t) => (
                    <input key={t} className="adm-in num ltr" inputMode="numeric" value={r.prices[t] ?? ""} placeholder="—"
                      onChange={(e) => setRow(i, { prices: { ...r.prices, [t]: e.target.value } })} aria-label={`قیمت ${DELIVERY[t].title}`} />
                  ))}
                  <button className="ap-x" onClick={() => set({ rows: d.rows.filter((_, j) => j !== i) })} aria-label="حذف ردیف">×</button>
                </div>
              ))}
              <button className="link ap-add" onClick={() => set({ rows: [...d.rows, { key: "", label: "", prices: {} }] })}>+ افزودن گزینه</button>
            </div>
          </section>

          <section className="dash-sec ap-sec">
            <h2>فروش بیشتر</h2>
            <label className="ap-sw"><input type="checkbox" checked={d.groupOn} onChange={(e) => set({ groupOn: e.target.checked })} /><span><b>خرید گروهی</b><small className="muted">مشتری برای چند نفر با هم می‌خرد و هر نفر تخفیف می‌گیرد (حداکثر {fa(MAX_SEATS)} نفر).</small></span></label>
            {d.groupOn && (
              <div className="ap-tiers">
                {d.group.map(([n, o], i) => (
                  <div key={i} className="ap-tier">
                    <span>از</span><input className="adm-in num" value={n} onChange={(e) => set({ group: d.group.map((g, j) => (j === i ? [e.target.value, g[1]] : g)) })} aria-label="تعداد نفر" />
                    <span>نفر،</span><input className="adm-in num" value={o} onChange={(e) => set({ group: d.group.map((g, j) => (j === i ? [g[0], e.target.value] : g)) })} aria-label="درصد" />
                    <span>٪ تخفیف</span>
                    <button className="ap-x" onClick={() => set({ group: d.group.filter((_, j) => j !== i) })} aria-label="حذف">×</button>
                  </div>
                ))}
                {d.group.length < 4 && <button className="link ap-add" onClick={() => set({ group: [...d.group, ["", ""]] })}>+ پله تخفیف</button>}
              </div>
            )}
            <label className="ap-sw"><input type="checkbox" checked={d.ip} disabled={!isSub} onChange={(e) => set({ ip: e.target.checked })} /><span><b>افزودنی آی‌پی ثابت خارج</b><small className="muted">{isSub ? "در صفحه خرید به‌عنوان گزینه اختیاری پیشنهاد می‌شود." : "فقط برای اشتراک‌ها."}</small></span></label>
            <div className="ap-2">
              <Field label="برچسب کارت (مثلاً «پرفروش»)"><input className="adm-in" value={d.badge} onChange={(e) => set({ badge: e.target.value })} /></Field>
              <Field label="رنگ برند"><span className="ap-color"><input type="color" value={d.color || "#b9ff63"} onChange={(e) => set({ color: e.target.value })} /><input className="adm-in ltr" value={d.color} placeholder="پیش‌فرض" onChange={(e) => set({ color: e.target.value })} /></span></Field>
            </div>
          </section>

          <section className="dash-sec ap-sec">
            <h2>صفحه محصول و سئو</h2>
            <div className="ap-2">
              <Field label="آدرس صفحه"><span className="ap-slug"><span className="ltr muted">accdrop.ir/</span><input className="adm-in ltr" value={d.slug} placeholder={d.id || "midjourney"} onChange={(e) => set({ slug: e.target.value })} /></span></Field>
              <Field label="نام فارسی (برای جست‌وجو)"><input className="adm-in" value={d.faName} placeholder="میدجرنی" onChange={(e) => set({ faName: e.target.value })} /></Field>
            </div>
            <Field label="معرفی بالای صفحه"><textarea rows={3} value={d.intro} onChange={(e) => set({ intro: e.target.value })} /></Field>
            <Field label="مناسب برای (هر خط یکی)"><textarea rows={3} value={d.forWho} onChange={(e) => set({ forWho: e.target.value })} /></Field>
          </section>
        </div>

        <aside className="ap-side">
          <div className="dash-sec ap-prev" style={{ "--b": d.color || "#B9FF63" } as CSSProperties}>
            <small className="muted">پیش‌نمایش کارت</small>
            <div className="ap-card">
              <span className="ap-logo"><BrandLogo id={isNew ? d.id || "x" : id} size={26} /></span>
              {d.badge && <i className="ap-tag lime">{d.badge}</i>}
              <b className="en">{d.name || "نام محصول"}</b>
              <small>{d.use || d.description || "توضیح کوتاه"}</small>
              <span className="num">از {money(preview.min)} تومان</span>
            </div>
          </div>
          <div className="dash-sec ap-pub">
            <label className="ap-sw"><input type="checkbox" checked={!d.hidden} onChange={(e) => set({ hidden: !e.target.checked })} /><span><b>{d.hidden ? "مخفی" : "منتشر شده"}</b><small className="muted">{d.hidden ? "در سایت دیده نمی‌شود و قابل خرید نیست." : "در سایت دیده می‌شود."}</small></span></label>
            {err && <p className="ap-err" role="alert">{err}</p>}
            <button className="btn btn-paper btn-block" onClick={save} disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره"}</button>
            {!isNew && edited && <button className="link adm-danger" onClick={reset}>{data?.added.includes(id) ? "حذف محصول" : "برگرداندن به حالت اولیه"}</button>}
          </div>
        </aside>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="ap-f"><span>{label}</span>{children}</label>;
}
