"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fa, money } from "@/lib/format";
import { api } from "./account";
import { useStore } from "./store";

type SP = { id: number; name: string; description: string; howToUse: string; cost: number; stock: number; available: boolean; unlimited: boolean };
type Ours = { productId: string; plan: string; name: string; label: string; price: number };
type Data = { configured: boolean; rate: { rate: number; source: string }; ours: Ours[]; map: { productId: string; plan: string; supplierId: number }[]; products: SP[]; balance: number | null; test?: boolean; error?: string };

const round = (n: number) => Math.round(n / 1000) * 1000;

/** Supplier (Insight Store) catalog: cost in Toman at today's Tether rate, next to our price, with one-click import and mapping. */
export function AdminSupplier() {
  const { notify } = useStore();
  const [d, setD] = useState<Data | null>(null);
  const [markup, setMarkup] = useState(25);
  const [q, setQ] = useState("");
  const load = useCallback(async () => { const r = await api<Data>("/api/admin/supplier"); if (r.ours) setD(r); }, []);
  useEffect(() => { load(); }, [load]);
  const list = useMemo(() => (d?.products ?? []).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name)), [d, q]);
  if (!d) return <p className="muted">…</p>;
  const rate = d.rate.rate;
  const key = (o: { productId: string; plan: string }) => `${o.productId}|${o.plan}`;
  const mappedTo = (sid: number) => d.map.filter((m) => m.supplierId === sid);

  const connect = async (sid: number, value: string) => {
    const old = mappedTo(sid)[0];
    if (old) await api("/api/admin/supplier", { body: { productId: old.productId, plan: old.plan, supplierId: null } });
    if (value) { const [productId, plan] = value.split("|"); await api("/api/admin/supplier", { body: { productId, plan, supplierId: sid } }); }
    notify(value ? "وصل شد؛ از این به بعد کد خودکار خریده و تحویل می‌شود" : "اتصال برداشته شد");
    load();
  };

  return (
    <>
      <header className="dash-h"><h1>تأمین‌کننده</h1><p className="muted">کاتالوگ اینسایت استور با قیمت تمام‌شده به تومان (تتر امروز {money(rate)} تومان). محصولی که وصل شود، بعد از پرداخت مشتری خودکار از کیف پول تأمین‌کننده خریده و کدش تحویل می‌شود؛ اول از انبار کدهای خودمان برداشته می‌شود.</p></header>
      {!d.configured ? (
        <div className="dash-sec"><b>هنوز وصل نیست</b><p className="muted">کلید API را در Vercel با نام <span className="en sel">INSIGHT_API_KEY</span> بگذار و دوباره دیپلوی کن. برای امتحان بدون خرج، <span className="en sel">INSIGHT_TEST_MODE=1</span> را هم بگذار.</p></div>
      ) : (
        <>
          <div className="sup-top">
            <div className="dash-sec sup-stat"><small className="muted">موجودی کیف پول</small><b className="num">{d.balance === null ? "؟" : `${fa(d.balance.toFixed(2))} تتر`}</b>{d.balance !== null && <small className="muted num">≈ {money(round(d.balance * rate))} تومان</small>}</div>
            <div className="dash-sec sup-stat"><small className="muted">محصولات</small><b className="num">{fa(d.products.filter((p) => p.available).length)} موجود از {fa(d.products.length)}</b></div>
            <div className="dash-sec sup-stat"><small className="muted">سود پیشنهادی برای محصول جدید</small><b><input className="adm-in ltr sup-mk" type="number" min={0} max={300} value={markup} onChange={(e) => setMarkup(Number(e.target.value) || 0)} />٪</b></div>
          </div>
          {d.test && <p className="adm-split warn">حالت آزمایشی API روشن است؛ کدها با TEST- شروع می‌شوند و پولی خرج نمی‌شود.</p>}
          {d.error && <p className="adm-split warn">خطا از API تأمین‌کننده: <span className="en">{d.error}</span></p>}
          <input className="adm-in sup-q" placeholder="جست‌وجو در محصولات تأمین‌کننده" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="sup-tbl-w">
            <table className="sup-tbl">
              <thead><tr><th>محصول تأمین‌کننده</th><th>موجودی</th><th>قیمت تمام‌شده</th><th>وصل به محصول ما</th><th>قیمت ما / سود</th><th /></tr></thead>
              <tbody>
                {list.map((p) => {
                  const costT = round(p.cost * rate);
                  const m = mappedTo(p.id)[0];
                  const ours = m ? d.ours.find((o) => key(o) === key(m)) : undefined;
                  const margin = ours ? ours.price - costT : 0;
                  const suggest = round(costT * (1 + markup / 100));
                  return (
                    <tr key={p.id} className={p.available ? "" : "off"}>
                      <td><b className="en">{p.name}</b>{p.description && <small className="muted">{p.description.slice(0, 120)}</small>}</td>
                      <td className="num">{p.unlimited ? "∞" : fa(p.stock)}</td>
                      <td><b className="num">{money(costT)}</b><small className="muted num en">{p.cost} USDT</small></td>
                      <td>
                        <select className="adm-in" value={m ? key(m) : ""} onChange={(e) => connect(p.id, e.target.value)}>
                          <option value="">وصل نیست</option>
                          {d.ours.map((o) => <option key={key(o)} value={key(o)}>{o.name} • {o.label}</option>)}
                        </select>
                      </td>
                      <td>{ours ? <><b className="num">{money(ours.price)}</b><small className={`num ${margin < 0 ? "bad" : "ok"}`}>{margin < 0 ? "ضرر " : "سود "}{money(Math.abs(margin))} ({fa(Math.round((margin / Math.max(1, costT)) * 100))}٪)</small></> : <small className="muted">پیشنهاد: <span className="num">{money(suggest)}</span></small>}</td>
                      <td>{!m && p.available && <a className="link" href={`/admin/products/new?${new URLSearchParams({ ix: String(p.id), name: p.name, desc: p.description.slice(0, 300), price: String(suggest), label: "یک کد" })}`}>ساخت محصول</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!list.length && <p className="muted">محصولی پیدا نشد.</p>}
        </>
      )}
    </>
  );
}
