"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { extrasLabel, optionLabel, productById } from "@/lib/catalog";
import type { Order } from "@/lib/account";
import { EMPTY_LEGAL, PAY_TITLE, type LegalInfo, type PayMethod } from "@/lib/billing";
import { fa, faDate, money } from "@/lib/format";
import { api, useAccount } from "@/components/account";
import { Icon } from "@/components/brand";
import { LegalForm, useLegal } from "@/components/legal";
import { useStore } from "@/components/store";

type Seller = { name: string; nationalId: string; economicCode: string; regNo: string; postal: string; address: string; phone: string };
type Data = { order: Order; seller: Seller; vat: number; buyerName: string };

/** Splits the order total (VAT included, in Rial) into invoice rows: amount, discount, net, VAT, total. */
function rows(o: Order, vat: number) {
  const totalR = o.total * 10, subR = o.subtotal * 10;
  let left = totalR;
  return o.lines.map((l, i) => {
    const gross = l.price * 10;
    const last = i === o.lines.length - 1;
    const paid = last ? left : Math.round((gross * totalR) / Math.max(1, subR));
    left -= paid;
    const ex = (n: number) => Math.round((n * 100) / (100 + vat));
    const amount = ex(gross), net = ex(paid);
    return { l, amount, discount: amount - net, net, tax: paid - net, total: paid };
  });
}

const R = (n: number) => money(n);

export default function InvoicePage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = decodeURIComponent(raw).toUpperCase();
  const { ready, user } = useAccount();
  const { notify } = useStore();
  const [d, setD] = useState<Data | null | undefined>(undefined);
  const [edit, setEdit] = useState(false);
  const saved = useLegal(!!user && edit);
  const [legal, setLegal] = useState<LegalInfo>(EMPTY_LEGAL);
  const [bad, setBad] = useState<keyof LegalInfo | "">("");
  useEffect(() => { if (ready && user) api<Data>(`/api/orders/${encodeURIComponent(code)}/invoice`).then((r) => setD(r.order ? r : null)); }, [ready, user, code]);
  useEffect(() => { if (edit) setLegal(d?.order.invoice ?? saved ?? EMPTY_LEGAL); }, [edit, saved, d]);

  if (!ready || (user && d === undefined)) return <div className="wrap dash-wait" />;
  if (!user || !d) return (
    <div className="wrap co-empty"><h1>فاکتور پیدا نشد</h1><p className="muted">{user ? "فاکتور فقط برای سفارش‌های پرداخت‌شده صادر می‌شود." : "برای دیدن فاکتور وارد حسابت شو."}</p>
      <Link className="btn btn-paper" href={user ? `/orders/${code}` : `/login?next=/orders/${code}/invoice`}>{user ? "برگشت به سفارش" : "ورود"} <Icon id="arrow" className="arrow" /></Link></div>
  );

  const { order: o, seller: s, vat } = d;
  const b = o.invoice;
  const list = rows(o, vat);
  const sum = (k: "amount" | "discount" | "net" | "tax" | "total") => list.reduce((x, r) => x + r[k], 0);

  const save = async () => {
    const r = await api<{ invoice: LegalInfo }>(`/api/orders/${encodeURIComponent(code)}/invoice`, { body: legal });
    if (r.invoice) { setD({ ...d, order: { ...o, invoice: r.invoice } }); setEdit(false); notify("فاکتور به نام شما صادر شد"); return; }
    if (r.error === "locked") { notify("این فاکتور در سامانه مالیاتی ثبت شده و قابل تغییر نیست"); return; }
    setBad((r.field as keyof LegalInfo) ?? "name");
  };

  return (
    <div className="wrap iv-wrap">
      <nav className="crumbs iv-noprint" aria-label="مسیر"><Link href="/account/orders">سفارش‌ها</Link><span>/</span><Link href={`/orders/${o.code}`} className="en">{o.code}</Link><span>/</span><span>فاکتور</span></nav>
      <div className="iv-tools iv-noprint">
        <button className="btn btn-paper" onClick={() => print()}>چاپ یا ذخیره PDF</button>
        {!o.taxId && <button className="btn btn-ghost" onClick={() => setEdit(!edit)}>{b ? "ویرایش اطلاعات خریدار" : "فاکتور به نام شرکت می‌خواهم"}</button>}
      </div>
      {edit && (
        <div className="co-step on iv-edit iv-noprint">
          <LegalForm value={legal} onChange={(v) => { setLegal(v); setBad(""); }} bad={bad} />
          <div className="iv-tools"><button className="btn btn-paper" onClick={save}>صدور فاکتور با این مشخصات</button><button className="btn btn-ghost" onClick={() => setEdit(false)}>انصراف</button></div>
        </div>
      )}

      <article className="iv-paper" dir="rtl">
        <header className="iv-h">
          <div><b className="iv-brand">{s.name}</b><small>اک‌دراپ • accdrop.ir</small></div>
          <h1>صورتحساب فروش کالا و خدمات</h1>
          <dl>
            <div><dt>شماره</dt><dd className="en">{o.code}</dd></div>
            <div><dt>تاریخ</dt><dd>{faDate(o.paidAt ?? o.createdAt, false)}</dd></div>
            {o.taxId && <div><dt>شماره مالیاتی</dt><dd className="en">{o.taxId}</dd></div>}
          </dl>
        </header>

        <section className="iv-party">
          <h2>مشخصات فروشنده</h2>
          <div className="iv-kv">
            <span>نام: <b>{s.name}</b></span>
            {s.nationalId && <span>شناسه ملی: <b className="num">{fa(s.nationalId)}</b></span>}
            {s.economicCode && <span>کد اقتصادی: <b className="num">{fa(s.economicCode)}</b></span>}
            {s.regNo && <span>شماره ثبت: <b className="num">{fa(s.regNo)}</b></span>}
            {s.postal && <span>کد پستی: <b className="num">{fa(s.postal)}</b></span>}
            {s.phone && <span>تلفن: <b className="num">{fa(s.phone)}</b></span>}
            {s.address && <span className="w">نشانی: {s.address}</span>}
          </div>
        </section>

        <section className="iv-party">
          <h2>مشخصات خریدار</h2>
          {b ? (
            <div className="iv-kv">
              <span>{b.kind === "company" ? "نام شرکت" : "نام"}: <b>{b.name}</b></span>
              <span>{b.kind === "company" ? "شناسه ملی" : "کد ملی"}: <b className="num">{fa(b.nationalId)}</b></span>
              {b.economicCode && <span>کد اقتصادی: <b className="num">{fa(b.economicCode)}</b></span>}
              {b.regNo && <span>شماره ثبت: <b className="num">{fa(b.regNo)}</b></span>}
              <span>کد پستی: <b className="num">{fa(b.postal)}</b></span>
              {b.phone && <span>تلفن: <b className="num">{fa(b.phone)}</b></span>}
              <span className="w">نشانی: {b.address}</span>
            </div>
          ) : (
            <div className="iv-kv"><span>نام: <b>{d.buyerName || "مشتری اک‌دراپ"}</b></span><span>موبایل: <b className="num">{fa(o.mobile)}</b></span></div>
          )}
        </section>

        <div className="iv-tbl-w">
          <table className="iv-tbl">
            <thead><tr><th>ردیف</th><th>شرح کالا یا خدمت</th><th>تعداد</th><th>مبلغ (ریال)</th><th>تخفیف</th><th>مبلغ پس از تخفیف</th><th>ارزش افزوده ({fa(vat)}٪)</th><th>جمع کل (ریال)</th></tr></thead>
            <tbody>
              {list.map((r, i) => {
                const p = productById(r.l.id);
                return (
                  <tr key={i}>
                    <td className="num">{fa(i + 1)}</td>
                    <td className="iv-d"><span className="en">{p.name}</span> • {optionLabel(p, r.l.plan)}{extrasLabel(r.l) ? ` • ${extrasLabel(r.l)}` : ""}</td>
                    <td className="num">{fa(1)}</td>
                    <td className="num">{R(r.amount)}</td>
                    <td className="num">{R(r.discount)}</td>
                    <td className="num">{R(r.net)}</td>
                    <td className="num">{R(r.tax)}</td>
                    <td className="num">{R(r.total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td colSpan={3}>جمع</td><td className="num">{R(sum("amount"))}</td><td className="num">{R(sum("discount"))}</td><td className="num">{R(sum("net"))}</td><td className="num">{R(sum("tax"))}</td><td className="num"><b>{R(sum("total"))}</b></td></tr></tfoot>
          </table>
        </div>

        <footer className="iv-f">
          <p>مبلغ پرداخت‌شده: <b className="num">{money(o.total)}</b> تومان ({R(o.total * 10)} ریال) • روش پرداخت: {PAY_TITLE[(o.payMethod as PayMethod) ?? "card"] ?? "درگاه بانکی"}{o.refId && o.refId !== "TEST" ? <> • کد پیگیری <span className="en">{o.refId}</span></> : null}</p>
          <p className="muted">قیمت‌ها شامل مالیات بر ارزش افزوده است. {o.taxId ? "این صورتحساب در سامانه مؤدیان ثبت شده است." : "شماره مالیاتی پس از ثبت در سامانه مؤدیان روی همین فاکتور درج می‌شود."}</p>
          <div className="iv-sign"><span>مهر و امضای فروشنده</span><span>مهر و امضای خریدار</span></div>
        </footer>
      </article>
    </div>
  );
}
