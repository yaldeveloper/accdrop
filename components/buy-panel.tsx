"use client";

import { useState, type CSSProperties } from "react";
import { CURRENT_DROP, DELIVERY, deliveryTypes, planKeys, priceOf, type DeliveryType, type Months, type Product, type Selection } from "@/lib/catalog";
import { clubPoints, duration, fa, money } from "@/lib/format";
import { Dots, Icon } from "./brand";
import { AccessPass } from "./pass";
import { useStore } from "./store";

function initial(p: Product): Selection {
  if (CURRENT_DROP.productId === p.id) return { id: p.id, plan: CURRENT_DROP.plan, type: CURRENT_DROP.type };
  const plan = planKeys(p)[0];
  return { id: p.id, plan, type: Object.keys(p.plans[plan] ?? {})[0] as DeliveryType };
}

/** Product page purchase block: live pass preview + plan/delivery choice + sticky mobile bar. */
export function BuyPanel({ product: p }: { product: Product }) {
  const { addLine, setView, notify } = useStore();
  const [sel, setSel] = useState<Selection>(() => initial(p));
  const months = planKeys(p);
  const offers = p.plans[sel.plan] ?? {};
  const perMonth = months.map((m) => Math.min(...(Object.values(p.plans[m] ?? {}) as number[])) / Number(m));
  const { price, was } = priceOf(sel);

  const choose = (patch: Partial<Selection>) => setSel((s) => {
    const next = { ...s, ...patch };
    const o = p.plans[next.plan] ?? {};
    if (!o[next.type]) next.type = Object.keys(o)[0] as DeliveryType;
    return next;
  });
  const buy = () => { addLine(sel); setView("checkout"); };
  const add = () => { addLine(sel); notify(`${p.name} به سبد اضافه شد`); };

  return (
    <>
      <div className="buy">
        <AccessPass product={p} months={sel.plan} price={price} className="buy-pass" />
        <div className="buy-box">
          <div className="grp">
            <h4>چه مدت؟</h4>
            <div className="opts h" style={{ "--n": months.length } as CSSProperties}>
              {months.map((m: Months, i) => {
                const save = i > 0 ? Math.round((1 - perMonth[i] / perMonth[0]) * 100) : 0;
                return (
                  <button key={m} className={`opt ${m === sel.plan ? "on" : ""}`} onClick={() => choose({ plan: m })} aria-pressed={m === sel.plan}>
                    {save > 0 && <span className="sv">−{save}%</span>}
                    <b>{duration(m)}</b>
                    <small className="num">{money(Math.min(...(Object.values(p.plans[m] ?? {}) as number[])))} تومان</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grp">
            <h4>کجا فعال شود؟</h4>
            <div className="opts v">
              {deliveryTypes(p).map((t) => {
                const amount = offers[t];
                return (
                  <button key={t} className={`opt ${t === sel.type ? "on" : ""}`} disabled={!amount} onClick={() => choose({ type: t })} aria-pressed={t === sel.type}>
                    <b>{DELIVERY[t].title}{amount ? <span className="num" style={{ fontWeight: 400, opacity: 0.7 }}> · {money(amount)}</span> : null}</b>
                    <small>{amount ? DELIVERY[t].detail : "برای این مدت موجود نیست"}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="total">
            <div>{was ? <s className="num">{money(was)}</s> : null}<b className="num">{money(price)}</b> <small>تومان</small></div>
            <small><span className="num">{fa(clubPoints(price))}</span> امتیاز کلاب</small>
          </div>
          <div className="buy-ctas">
            <button className="btn btn-paper" onClick={buy}>همین الان بخر <Icon id="arrow" className="arrow" /></button>
            <button className="btn btn-ghost" onClick={add} aria-label="افزودن به سبد"><Icon id="bag" /></button>
          </div>
          <ul className="buy-notes">
            <li><Dots size={3} />فعال در حدود {fa(p.etaMinutes)} دقیقه</li>
            <li><Dots size={3} />{sel.type === "own" ? "فقط ایمیل، نه رمز" : "ایمیل و رمز پیامک می‌شود"}</li>
            <li><Dots size={3} />گارانتی تا روز آخر</li>
          </ul>
        </div>
      </div>
      <div className="buybar" role="region" aria-label="خرید سریع">
        <div><small>{duration(sel.plan)} · {DELIVERY[sel.type].title}</small><b className="num">{money(price)} <small>تومان</small></b></div>
        <button className="btn btn-paper" onClick={buy}>خرید</button>
      </div>
    </>
  );
}
