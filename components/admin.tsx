"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DELIVERY, extrasLabel, optionLabel, productById } from "@/lib/catalog";
import { STATUS_TITLE, type Order, type OrderStatus } from "@/lib/account";
import { fa, faDate, money } from "@/lib/format";
import { api, useAccount } from "./account";
import { BrandLogo, Icon } from "./brand";
import { StatusChip } from "./orders";
import { useStore } from "./store";

const NAV = [
  ["/admin", "خلاصه"],
  ["/admin/orders", "سفارش‌ها"],
  ["/admin/products", "محصولات"],
  ["/admin/supplier", "تأمین‌کننده"],
  ["/admin/chat", "چت آنلاین"],
  ["/admin/reviews", "نظرات"],
  ["/admin/blog", "بلاگ"],
  ["/admin/tickets", "تیکت‌ها"],
  ["/admin/codes", "انبار کد"],
  ["/admin/resellers", "نماینده‌ها"],
  ["/admin/users", "کاربران"],
  ["/admin/discounts", "کد تخفیف"],
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { ready, user } = useAccount();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => { if (ready && !user) router.replace(`/login?next=${encodeURIComponent(path)}`); }, [ready, user, path, router]);
  if (!ready || !user) return <div className="wrap dash-wait" />;
  if (!user.isAdmin) {
    return (
      <div className="wrap co-empty">
        <h1>دسترسی نداری</h1>
        <p className="muted">این بخش فقط برای مدیران اک‌دراپ است.</p>
        <Link className="btn btn-paper" href="/account">داشبورد من <Icon id="arrow" className="arrow" /></Link>
      </div>
    );
  }
  const on = (href: string) => (href === "/admin" ? path === href : path.startsWith(href));
  return (
    <div className="wrap dash adm">
      <aside className="dash-side">
        <div className="dash-me"><span className="dash-av">A</span><div><b>پنل مدیریت</b><small className="num muted">{fa(user.mobile)}</small></div></div>
        <nav aria-label="مدیریت">{NAV.map(([href, label]) => <Link key={href} href={href} className={on(href) ? "on" : ""}>{label}</Link>)}</nav>
      </aside>
      <div className="dash-main">{children}</div>
    </div>
  );
}

function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const load = useCallback(async () => { const r = await api<T>(path); if (!r.error) setData(r); return r; }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data, setData, reload: load };
}

const lineText = (l: Order["lines"][number]) => {
  const p = productById(l.id);
  const x = extrasLabel(l);
  return `${p.name} • ${optionLabel(p, l.plan)} • ${DELIVERY[l.type].title}${x ? ` • ${x}` : ""}`;
};

// ----- Overview -----
type Stats = { today: number; todayCount: number; month: number; monthCount: number; open: number; pendingResellers: number; users: number; openTickets: number; openChats: number;
  lowStock: { productId: string; plan: string; free: number; waiting: number }[] };

export function AdminHome() {
  const { data: s } = useApi<Stats>("/api/admin/stats");
  const { data: q } = useApi<{ orders: Order[] }>("/api/admin/orders?status=open");
  return (
    <>
      <header className="dash-h"><h1>خلاصه</h1><p className="muted">فروش، کارهای باز و موجودی انبار.</p></header>
      <div className="adm-stats">
        <div><small>فروش امروز</small><b className="num">{s ? money(s.today) : "…"}</b><span className="muted">{s ? `${fa(s.todayCount)} سفارش` : ""}</span></div>
        <div><small>۳۰ روز اخیر</small><b className="num">{s ? money(s.month) : "…"}</b><span className="muted">{s ? `${fa(s.monthCount)} سفارش` : ""}</span></div>
        <Link href="/admin/orders?status=open"><small>منتظر فعال‌سازی</small><b className="num">{s ? fa(s.open) : "…"}</b><span className="muted">سفارش باز</span></Link>
        <Link href="/admin/tickets"><small>تیکت و چت بی‌پاسخ</small><b className={`num ${s?.openTickets || s?.openChats ? "warn" : ""}`}>{s ? fa(s.openTickets + s.openChats) : "…"}</b><span className="muted">{s ? `${fa(s.openChats)} چت • ${fa(s.pendingResellers)} نمایندگی` : ""}</span></Link>
      </div>
      {!!s?.lowStock.length && (
        <div className="dash-sec">
          <h2>انبار کد <Link className="link" href="/admin/codes">شارژ انبار</Link></h2>
          <ul className="adm-low">{s.lowStock.map((x) => {
            const p = productById(x.productId);
            return <li key={x.productId + x.plan}><BrandLogo id={p.id} size={18} /><span className="en">{p.name}</span><span>{optionLabel(p, x.plan)}</span>
              <span className={x.free ? "muted" : "warn"}>{fa(x.free)} کد مانده</span>{x.waiting > 0 && <span className="warn">{fa(x.waiting)} سفارش منتظر کد</span>}</li>;
          })}</ul>
        </div>
      )}
      <div className="dash-sec">
        <h2>کارهای باز</h2>
        {q?.orders.length ? <AdminOrderList orders={q.orders} /> : <p className="muted">{q ? "سفارش بازی نیست." : "…"}</p>}
      </div>
    </>
  );
}

// ----- Orders -----
function AdminOrderList({ orders }: { orders: Order[] }) {
  return (
    <div className="ord-list">
      {orders.map((o) => (
        <Link key={o.code} href={`/admin/orders/${o.code}`} className="ord-row">
          <span className="ord-logos">{o.lines.slice(0, 3).map((l, i) => <span className="mono" key={i}><BrandLogo id={l.id} size={18} /></span>)}</span>
          <span className="ord-t"><b className="en">{o.code}</b><small>{o.lines.map((l) => productById(l.id).name).join("، ")} • <span className="num">{fa(o.mobile)}</span>
            {o.split && <i className="ord-tag">دنگ {fa(o.split.paid)}/{fa(o.split.seats)}</i>}{o.invoice && <i className="ord-tag">فاکتور رسمی</i>}{o.payMethod === "bnpl" && <i className="ord-tag">اقساطی</i>}</small></span>
          <span className="ord-d muted">{faDate(o.createdAt)}</span>
          <StatusChip order={o} />
          <span className="ord-p num">{money(o.total)}</span>
          <Icon id="arrow" className="arrow" />
        </Link>
      ))}
    </div>
  );
}

const FILTERS: [string, string][] = [["open", "باز"], ["", "همه"], ["active", "فعال‌شده"], ["pending", "در انتظار پرداخت"], ["canceled", "پرداخت نشده"], ["refunded", "بازپرداخت"]];

export function AdminOrders({ initialStatus = "open" }: { initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const { data } = useApi<{ orders: Order[] }>(`/api/admin/orders?status=${status}&q=${encodeURIComponent(term)}`);
  return (
    <>
      <header className="dash-h"><h1>سفارش‌ها</h1><p className="muted">سفارش‌های باز را فعال کن یا اطلاعات تحویل را ثبت کن.</p></header>
      <div className="adm-bar">
        <div className="chips">{FILTERS.map(([k, t]) => <button key={k} className={status === k ? "on" : ""} onClick={() => setStatus(k)}>{t}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }}><input className="adm-in ltr" placeholder="کد سفارش یا موبایل" value={q} onChange={(e) => setQ(e.target.value)} /></form>
      </div>
      {!data ? <p className="muted">…</p> : data.orders.length ? <AdminOrderList orders={data.orders} /> : <p className="muted">سفارشی پیدا نشد.</p>}
    </>
  );
}

const NEXT: Partial<Record<OrderStatus, [OrderStatus, string][]>> = {
  paid: [["activating", "شروع فعال‌سازی"], ["active", "فعال شد"]],
  activating: [["active", "فعال شد"]],
};

export function AdminOrder({ code }: { code: string }) {
  const { notify } = useStore();
  const { data, setData } = useApi<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(code)}`);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const [taxId, setTaxId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const o = data?.order;
  if (!o) return <p className="muted">…</p>;

  const save = async (patch: { status?: OrderStatus }, msg: string) => {
    setBusy(true);
    const r = await api<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(code)}`, { method: "PATCH", body: { ...patch, secrets, note: note ?? undefined, taxId: taxId ?? undefined } });
    setBusy(false);
    if (r.order) { setData({ order: r.order }); setSecrets({}); setTaxId(null); notify(msg); } else notify("ذخیره نشد");
  };
  const dirty = Object.keys(secrets).length > 0 || note !== null || taxId !== null;
  const sp = o.split;
  const held = sp && sp.status === "open" && (o.status === "paid" || o.status === "activating");

  return (
    <>
      <header className="dash-h adm-oh">
        <div><h1 className="en">{o.code}</h1><p className="muted">ثبت {faDate(o.createdAt)}{o.paidAt ? ` • پرداخت ${faDate(o.paidAt)}` : ""}{o.refId ? ` • کد پیگیری ${o.refId}` : ""}</p></div>
        <StatusChip order={o} />
      </header>
      {sp && (
        <div className={`adm-split ${held ? "warn" : ""}`}>
          <b>دنگ <a className="en link" href={`/dong/${sp.code}`} target="_blank" rel="noreferrer">{sp.code}</a>: {fa(sp.paid)} از {fa(sp.seats)} نفر پرداخت کرده‌اند</b>
          <small>{held ? "گروه هنوز کامل نشده؛ تا کامل شدن یا بسته شدن گروه توسط سازنده، فعال نکن." : sp.status === "canceled" ? "گروه لغو شده؛ اگر پرداخت شده، بازپرداخت کن." : "گروه کامل یا بسته شده؛ می‌توانی فعال کنی."}</small>
        </div>
      )}
      <div className="adm-grid">
        <div className="dash-sec">
          <h2>اقلام</h2>
          <ul className="adm-lines">
            {o.lines.map((l) => (
              <li key={l.lineId}>
                <div className="adm-lh"><BrandLogo id={l.id} size={20} /><b>{lineText(l)}</b><span className="num">{money(l.price)}</span></div>
                {l.email && <p>ایمیل مشتری: <b className="en sel">{l.email}</b></p>}
                {l.username && <p>آیدی تلگرام: <b className="en sel">{l.username}</b></p>}
                {l.members?.length ? <p>اعضای گروه: {l.members.map((m) => <b key={m} className="en sel" style={{ marginInlineEnd: 8 }}>{m}</b>)}</p> : null}
                {l.number && <p>شماره ۵سیم: <b>{l.number.status}</b> • تلاش <span className="num">{fa(l.number.tries)}</span>{l.number.codes.length ? <> • کد: <b className="en sel">{l.number.codes.map((c) => c.code).join("، ")}</b></> : null}{l.supplyRef ? <> • <span className="en sel">{l.supplyRef}</span></> : null}</p>}
                {l.ip && <p>آی‌پی ثابت: <b>{extrasLabel({ ...l, seats: 1 })}</b> (مشخصات اتصال را در «اطلاعات تحویل» بنویس)</p>}
                {(l.type === "code" || l.type === "number" || l.type === "ready" || l.secret) && (
                  <div className="fld">
                    <label>{{ code: "کد گیفت‌کارت", number: "شماره تحویلی", ready: "اطلاعات ورود اکانت" }[l.type as "code"] ?? "اطلاعات تحویل"} (به مشتری نمایش داده می‌شود)</label>
                    <input className="ltr" value={secrets[l.lineId!] ?? l.secret ?? ""} placeholder={l.type === "code" ? "از انبار خودکار پر می‌شود" : ""}
                      onChange={(e) => setSecrets({ ...secrets, [l.lineId!]: e.target.value })} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="dash-sec adm-side">
          <h2>مشتری</h2>
          <p><span className="num">{fa(o.mobile)}</span></p>
          <dl className="co-totals">
            <div><dt>جمع</dt><dd className="num">{money(o.subtotal)}</dd></div>
            {o.discount > 0 && <div className="disc"><dt>تخفیف</dt><dd className="num">−{money(o.discount)}</dd></div>}
            <div className="tot"><dt>مبلغ</dt><dd><b className="num">{money(o.total)}</b> <small>تومان</small></dd></div>
          </dl>
          {o.payMethod && o.payMethod !== "card" && <p className="muted">روش پرداخت: {o.payMethod === "bnpl" ? "اقساطی (اسنپ‌پی)" : "ارز دیجیتال"}</p>}
          {o.invoice && (
            <div className="adm-inv">
              <b>فاکتور رسمی</b>
              <small>{o.invoice.kind === "company" ? "حقوقی" : "حقیقی"}: {o.invoice.name} • {o.invoice.kind === "company" ? "شناسه ملی" : "کد ملی"} <span className="num sel">{o.invoice.nationalId}</span>{o.invoice.economicCode ? <> • کد اقتصادی <span className="num sel">{o.invoice.economicCode}</span></> : null} • کد پستی <span className="num">{o.invoice.postal}</span></small>
              <small>{o.invoice.address}</small>
              <div className="fld"><label htmlFor="adm-tax">شماره منحصربه‌فرد مالیاتی (بعد از ثبت در سامانه مؤدیان)</label>
                <input id="adm-tax" className="ltr" value={taxId ?? o.taxId ?? ""} onChange={(e) => setTaxId(e.target.value)} /></div>
              <a className="link" href={`/orders/${o.code}/invoice`} target="_blank" rel="noreferrer">دیدن و چاپ فاکتور</a>
            </div>
          )}
          <div className="fld"><label htmlFor="adm-note">یادداشت داخلی</label>
            <textarea id="adm-note" rows={3} value={note ?? o.adminNote ?? ""} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="adm-actions">
            {(NEXT[o.status] ?? []).map(([s, t]) => <button key={s} className="btn btn-paper" disabled={busy} onClick={() => save({ status: s }, STATUS_TITLE[s])}>{t}</button>)}
            {dirty && <button className="btn btn-ghost" disabled={busy} onClick={() => save({}, "ذخیره شد")}>ذخیره تغییرات</button>}
            {(o.status === "paid" || o.status === "activating" || o.status === "active") && (
              <button className="link adm-danger" disabled={busy} onClick={() => { if (confirm("وجه این سفارش برگشت داده شده؟ وضعیت به «بازپرداخت شد» تغییر می‌کند.")) save({ status: "refunded" }, "ثبت شد"); }}>ثبت بازپرداخت</button>
            )}
          </div>
          <small className="muted">با «فعال شد» به مشتری پیامک می‌رود. بازپرداخت را اول از پنل زرین‌پال انجام بده، بعد اینجا ثبت کن.</small>
        </div>
      </div>
    </>
  );
}

// ----- Gift-code stock -----
type Stock = { productId: string; plan: string; free: number; total: number; waiting: number };

export function AdminCodes() {
  const { notify } = useStore();
  const { data, setData } = useApi<{ stock: Stock[] }>("/api/admin/codes");
  const [sel, setSel] = useState("");
  const [codes, setCodes] = useState("");
  const [busy, setBusy] = useState(false);
  const stock = data?.stock ?? [];
  const key = sel || (stock[0] ? `${stock[0].productId}|${stock[0].plan}` : "");
  const n = codes.split(/[\n,]+/).map((c) => c.trim()).filter(Boolean).length;
  const add = async () => {
    const [productId, plan] = key.split("|");
    setBusy(true);
    const r = await api<{ added: number; duplicates: number; stock: Stock[] }>("/api/admin/codes", { body: { productId, plan, codes } });
    setBusy(false);
    if (r.error) { notify("اضافه نشد"); return; }
    setData({ stock: r.stock }); setCodes("");
    notify(`${fa(r.added)} کد اضافه شد${r.duplicates ? `، ${fa(r.duplicates)} تکراری بود` : ""}`);
  };
  return (
    <>
      <header className="dash-h"><h1>انبار کد</h1><p className="muted">کدهای گیفت‌کارت را اینجا وارد کن. بعد از هر پرداخت، کد خودکار به مشتری تحویل می‌شود.</p></header>
      <div className="dash-sec">
        <div className="rs-table" role="table">
          <div className="rs-tr rs-th" role="row"><span>محصول</span><span>موجود</span><span>فروخته</span><span>منتظر کد</span></div>
          {stock.map((x) => { const p = productById(x.productId); return (
            <div className="rs-tr" role="row" key={x.productId + x.plan}>
              <span className="rs-p"><span className="mono"><BrandLogo id={p.id} size={18} /></span><b className="en">{p.name}</b><small className="muted">{optionLabel(p, x.plan)}</small></span>
              <span className={`num ${x.free < 3 ? "warn" : ""}`}>{fa(x.free)}</span><span className="num muted">{fa(x.total - x.free)}</span><span className={`num ${x.waiting ? "warn" : "muted"}`}>{fa(x.waiting)}</span>
            </div>); })}
        </div>
      </div>
      <form className="dash-sec adm-form" onSubmit={(e) => { e.preventDefault(); if (n) add(); }}>
        <h2>افزودن کد</h2>
        <div className="fld"><label htmlFor="ac-p">محصول و مبلغ</label>
          <select id="ac-p" value={key} onChange={(e) => setSel(e.target.value)}>
            {stock.map((x) => { const p = productById(x.productId); return <option key={x.productId + x.plan} value={`${x.productId}|${x.plan}`}>{p.name} • {optionLabel(p, x.plan)}</option>; })}
          </select></div>
        <div className="fld"><label htmlFor="ac-c">کدها (هر خط یک کد)</label>
          <textarea id="ac-c" className="ltr" rows={6} value={codes} onChange={(e) => setCodes(e.target.value)} placeholder={"XXXX-XXXX-XXXX-XXXX\nXXXX-XXXX-XXXX-XXXX"} /></div>
        <button className="btn btn-paper" disabled={busy || !n}>{n ? `افزودن ${fa(n)} کد` : "افزودن کد"}</button>
      </form>
    </>
  );
}

// ----- Resellers -----
type ResellerRow = { mobile: string; name: string; business: string; kind: string; link: string; volume: string; note: string; status: string; createdAt: number };

export function AdminResellers() {
  const { notify } = useStore();
  const { data, reload } = useApi<{ resellers: ResellerRow[] }>("/api/admin/resellers");
  const decide = async (mobile: string, status: string) => {
    const r = await api("/api/admin/resellers", { method: "PATCH", body: { mobile, status } });
    if (r.error) notify("ذخیره نشد"); else { notify(status === "approved" ? "تأیید شد" : "رد شد"); reload(); }
  };
  const T: Record<string, string> = { pending: "در حال بررسی", approved: "تأیید شده", rejected: "رد شده" };
  return (
    <>
      <header className="dash-h"><h1>نماینده‌ها</h1><p className="muted">درخواست‌های نمایندگی را بررسی و تأیید کن.</p></header>
      {!data ? <p className="muted">…</p> : !data.resellers.length ? <p className="muted">درخواستی نیست.</p> : (
        <div className="adm-cards">{data.resellers.map((r) => (
          <div className="dash-sec adm-card" key={r.mobile}>
            <div className="adm-lh"><b>{r.business}</b><span className={`chip ${r.status === "approved" ? "s2" : r.status === "pending" ? "s1" : "sx"}`}><i />{T[r.status]}</span></div>
            <p className="muted">{r.name || "بی‌نام"} • <span className="num">{fa(r.mobile)}</span> • {faDate(r.createdAt, false)}</p>
            <p>{r.kind} • {r.volume}</p>
            {r.link && <p className="en sel">{r.link}</p>}
            {r.note && <p className="muted">{r.note}</p>}
            <div className="adm-actions">
              {r.status !== "approved" && <button className="btn btn-paper" onClick={() => decide(r.mobile, "approved")}>تأیید</button>}
              {r.status !== "rejected" && <button className="btn btn-ghost" onClick={() => decide(r.mobile, "rejected")}>رد</button>}
            </div>
          </div>
        ))}</div>
      )}
    </>
  );
}

// ----- Users -----
type UserRow = { mobile: string; name: string; email: string; blocked: boolean; orders: number; spent: number; createdAt: number };

export function AdminUsers() {
  const { notify } = useStore();
  const [q, setQ] = useState(""), [term, setTerm] = useState("");
  const { data, reload } = useApi<{ users: UserRow[] }>(`/api/admin/users?q=${encodeURIComponent(term)}`);
  const toggle = async (u: UserRow) => {
    if (!u.blocked && !confirm(`حساب ${u.mobile} مسدود شود؟`)) return;
    await api("/api/admin/users", { method: "PATCH", body: { mobile: u.mobile, blocked: !u.blocked } });
    notify(u.blocked ? "آزاد شد" : "مسدود شد"); reload();
  };
  return (
    <>
      <header className="dash-h"><h1>کاربران</h1><p className="muted">{data ? `${fa(data.users.length)} کاربر آخر` : ""}</p></header>
      <form className="adm-bar" onSubmit={(e) => { e.preventDefault(); setTerm(q); }}><input className="adm-in" placeholder="موبایل، نام یا ایمیل" value={q} onChange={(e) => setQ(e.target.value)} /></form>
      <div className="rs-table" role="table">
        <div className="rs-tr rs-th adm-ut" role="row"><span>کاربر</span><span>خرید</span><span>مجموع</span><span /></div>
        {data?.users.map((u) => (
          <div className="rs-tr adm-ut" role="row" key={u.mobile}>
            <span className="rs-p"><b>{u.name || "بی‌نام"}</b><small className="muted num">{fa(u.mobile)}{u.email ? ` • ${u.email}` : ""}</small></span>
            <span className="num">{fa(u.orders)}</span><span className="num">{money(u.spent)}</span>
            <span><button className={`link ${u.blocked ? "" : "adm-danger"}`} onClick={() => toggle(u)}>{u.blocked ? "رفع مسدودی" : "مسدود"}</button></span>
          </div>
        ))}
      </div>
    </>
  );
}

// ----- Discounts -----
type Discount = { code: string; rate: number; active: boolean; uses: number; maxUses: number | null };

export function AdminDiscounts() {
  const { notify } = useStore();
  const { data, setData } = useApi<{ discounts: Discount[] }>("/api/admin/discounts");
  const [code, setCode] = useState(""), [pct, setPct] = useState("10"), [max, setMax] = useState("");
  const send = async (b: object, msg: string) => {
    const r = await api<{ discounts: Discount[] }>("/api/admin/discounts", { body: b });
    if (r.discounts) { setData({ discounts: r.discounts }); notify(msg); return true; }
    notify("کد باید ۳ تا ۲۴ حرف انگلیسی یا عدد باشد و درصد بین ۱ تا ۱۰۰"); return false;
  };
  return (
    <>
      <header className="dash-h"><h1>کد تخفیف</h1><p className="muted">کد بساز، سقف استفاده بگذار یا غیرفعالش کن.</p></header>
      <form className="dash-sec adm-form adm-row" onSubmit={async (e) => { e.preventDefault(); if (await send({ code, percent: Number(pct), maxUses: max ? Number(max) : null }, "ذخیره شد")) { setCode(""); setMax(""); } }}>
        <div className="fld"><label htmlFor="ad-c">کد</label><input id="ad-c" className="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="YALDA" /></div>
        <div className="fld"><label htmlFor="ad-p">درصد</label><input id="ad-p" className="ltr" inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value)} /></div>
        <div className="fld"><label htmlFor="ad-m">سقف استفاده (اختیاری)</label><input id="ad-m" className="ltr" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder="بدون سقف" /></div>
        <button className="btn btn-paper">ساخت کد</button>
      </form>
      <div className="rs-table" role="table">
        <div className="rs-tr rs-th" role="row"><span>کد</span><span>تخفیف</span><span>استفاده</span><span /></div>
        {data?.discounts.map((d) => (
          <div className={`rs-tr ${d.active ? "" : "adm-off"}`} role="row" key={d.code}>
            <span className="en">{d.code}</span><span className="num">{fa(Math.round(d.rate * 100))}٪</span>
            <span className="num">{fa(d.uses)}{d.maxUses ? ` از ${fa(d.maxUses)}` : ""}</span>
            <span><button className="link" onClick={() => send({ code: d.code, active: !d.active }, d.active ? "غیرفعال شد" : "فعال شد")}>{d.active ? "غیرفعال کن" : "فعال کن"}</button></span>
          </div>
        ))}
      </div>
    </>
  );
}
