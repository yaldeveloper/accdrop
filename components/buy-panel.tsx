"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { CURRENT_DROP, DELIVERY, deliveryTypes, planKeys, priceOf, type DeliveryType, type Months, type Product, type Selection } from "@/lib/catalog";
import { clubPoints, duration, fa, money } from "@/lib/format";
import { Icon } from "./brand";
import { useStore } from "./store";

function initial(p: Product): Selection {
  if (CURRENT_DROP.productId === p.id) return { id: p.id, plan: CURRENT_DROP.plan, type: CURRENT_DROP.type };
  const plan = planKeys(p)[0];
  return { id: p.id, plan, type: Object.keys(p.plans[plan] ?? {})[0] as DeliveryType };
}

const lowest = (p: Product, m: Months) => Math.min(...(Object.values(p.plans[m] ?? {}) as number[]));

/** The purchase card on a product page: duration, delivery method, price, one main button. */
export function BuyPanel({ product: p }: { product: Product }) {
  const { addLine, notify } = useStore();
  const router = useRouter();
  const [sel, setSel] = useState<Selection>(() => initial(p));
  const months = planKeys(p);
  const types = deliveryTypes(p);
  const offers = p.plans[sel.plan] ?? {};
  const perMonth = months.map((m) => lowest(p, m) / Number(m));
  const { price, was } = priceOf(sel);

  // Renewal links from the dashboard carry ?plan=&type=.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const plan = q.get("plan") as Months | null, type = q.get("type") as DeliveryType | null;
    if (plan && type && p.plans[plan]?.[type]) setSel({ id: p.id, plan, type });
  }, [p]);

  const cta = useRef<HTMLButtonElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    const el = cta.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting || e.boundingClientRect.top > innerHeight));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const choose = (patch: Partial<Selection>) => setSel((s) => {
    const next = { ...s, ...patch };
    const o = p.plans[next.plan] ?? {};
    if (!o[next.type]) next.type = Object.keys(o)[0] as DeliveryType;
    return next;
  });
  const buy = () => { addLine(sel); router.push("/checkout"); };
  const add = () => { addLine(sel); notify(`${p.name} به سبد اضافه شد`); };

  return (
    <div className="bx" id="buy">
      <h2 className="bx-t">انتخاب اشتراک</h2>

      <fieldset className="bx-g">
        <legend>مدت اشتراک</legend>
        <div className="bx-seg" style={{ "--n": months.length } as CSSProperties}>
          {months.map((m, i) => {
            const save = i > 0 ? Math.round((1 - perMonth[i] / perMonth[0]) * 100) : 0;
            const on = m === sel.plan;
            const t = p.plans[m]?.[sel.type] ? sel.type : (Object.keys(p.plans[m] ?? {})[0] as DeliveryType);
            const pr = priceOf({ id: p.id, plan: m, type: t }).price;
            return (
              <label key={m} className={`bx-s ${on ? "on" : ""}`}>
                <input type="radio" name="plan" checked={on} onChange={() => choose({ plan: m })} />
                {save > 0 && <span className="bx-tag">{fa(save)}٪ ارزان‌تر</span>}
                <b>{duration(m)}</b>
                <small className="num">{money(pr)}</small>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="bx-g">
        <legend>روش تحویل {types.length > 1 && <a href="#delivery" className="bx-help">فرقشان چیست؟</a>}</legend>
        {types.map((t) => {
          const amount = offers[t];
          const on = t === sel.type;
          return (
            <label key={t} className={`bx-o bx-o2 ${on ? "on" : ""} ${amount ? "" : "dis"}`}>
              <input type="radio" name="type" checked={on} disabled={!amount} onChange={() => choose({ type: t })} />
              <span className="bx-r" aria-hidden="true" />
              <span className="bx-l"><b>{DELIVERY[t].title}</b><small>{amount ? DELIVERY[t].detail : "برای این مدت موجود نیست"}</small></span>
              {types.length > 1 && amount ? <span className="bx-p num">{money(priceOf({ id: p.id, plan: sel.plan, type: t }).price)}</span> : null}
            </label>
          );
        })}
      </fieldset>

      <div className="bx-sum">
        <div className="bx-row"><span>مبلغ قابل پرداخت</span><span>{was ? <s className="num">{money(was)}</s> : null}<b className="num">{money(price)}</b> <small>تومان</small></span></div>
        <div className="bx-row sub"><span>تحویل</span><span>حدود {fa(p.etaMinutes)} دقیقه بعد از پرداخت</span></div>
        <div className="bx-row sub"><span>امتیاز کلاب</span><span className="num">{fa(clubPoints(price))} امتیاز</span></div>
      </div>

      <button ref={cta} className="btn btn-paper btn-block bx-cta" onClick={buy}>ادامه خرید <Icon id="arrow" className="arrow" /></button>
      <button className="add-link" onClick={add}>افزودن به سبد خرید</button>

      <ul className="bx-trust">
        <li><Icon id="lock" />پرداخت از درگاه بانکی رسمی؛ بدون کارت ارزی</li>
        <li><Icon id="shield" />اگر فعال نشد، کل مبلغ برمی‌گردد</li>
      </ul>

      <div className={`buybar ${ctaVisible ? "" : "on"}`} role="region" aria-label="خرید سریع">
        <div><small>{duration(sel.plan)} • {DELIVERY[sel.type].title}</small><b className="num">{money(price)} <small>تومان</small></b></div>
        <button className="btn btn-paper" onClick={buy}>ادامه خرید</button>
      </div>
    </div>
  );
}
