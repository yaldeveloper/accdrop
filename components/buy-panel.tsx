"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CURRENT_DROP, DELIVERY, deliveryTypes, planKeys, priceOf, type DeliveryType, type Months, type Product, type Selection } from "@/lib/catalog";
import { duration, fa, money } from "@/lib/format";
import { Dots, Icon } from "./brand";
import { AccessPass } from "./pass";
import { useStore } from "./store";

function initial(p: Product): Selection {
  if (CURRENT_DROP.productId === p.id) return { id: p.id, plan: CURRENT_DROP.plan, type: CURRENT_DROP.type };
  const plan = planKeys(p)[0];
  return { id: p.id, plan, type: Object.keys(p.plans[plan] ?? {})[0] as DeliveryType };
}

const lowest = (p: Product, m: Months) => Math.min(...(Object.values(p.plans[m] ?? {}) as number[]));

/**
 * Product page top: heading (passed in from the server page), two choices, one button.
 * The Access Pass on the side mirrors the choice live.
 */
export function BuyPanel({ product: p, children }: { product: Product; children: ReactNode }) {
  const { addLine, setView, notify } = useStore();
  const [sel, setSel] = useState<Selection>(() => initial(p));
  const months = planKeys(p);
  const types = deliveryTypes(p);
  const offers = p.plans[sel.plan] ?? {};
  const perMonth = months.map((m) => lowest(p, m) / Number(m));
  const { price, was } = priceOf(sel);

  const choose = (patch: Partial<Selection>) => setSel((s) => {
    const next = { ...s, ...patch };
    const o = p.plans[next.plan] ?? {};
    if (!o[next.type]) next.type = Object.keys(o)[0] as DeliveryType;
    return next;
  });
  const cta = useRef<HTMLButtonElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    const el = cta.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting || e.boundingClientRect.top > innerHeight));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const buy = () => { addLine(sel); setView("checkout"); };
  const add = () => { addLine(sel); notify(`${p.name} به سبد اضافه شد`); };

  return (
    <div className="pdp-g">
      <div className="pdp-main">
        {children}
        <div className="buy-box">
          <div className="grp">
            <h4>{types.length > 1 && <span className="en step">1</span>}مدت اشتراک</h4>
            <div className="opts h" style={{ "--n": months.length } as CSSProperties}>
              {months.map((m, i) => {
                const save = i > 0 ? Math.round((1 - perMonth[i] / perMonth[0]) * 100) : 0;
                return (
                  <button key={m} className={`opt ${m === sel.plan ? "on" : ""}`} onClick={() => choose({ plan: m })} aria-pressed={m === sel.plan}>
                    {save > 0 && <span className="sv">{fa(save)}٪ تخفیف</span>}
                    <b>{duration(m)}</b>
                    <small className="num">{money(lowest(p, m))}</small>
                  </button>
                );
              })}
            </div>
          </div>
          {types.length > 1 && (
            <div className="grp">
              <h4><span className="en step">2</span>نوع فعال‌سازی</h4>
              <div className="opts v">
                {types.map((t) => {
                  const amount = offers[t];
                  return (
                    <button key={t} className={`opt ${t === sel.type ? "on" : ""}`} disabled={!amount} onClick={() => choose({ type: t })} aria-pressed={t === sel.type}>
                      <b>{DELIVERY[t].title}</b>
                      <small>{amount ? DELIVERY[t].detail : "برای این مدت موجود نیست"}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="buy-pay">
            <div className="total">
              <small>قیمت نهایی</small>
              <div>{was ? <s className="num">{money(was)}</s> : null}<b className="num">{money(price)}</b> <small>تومان</small></div>
            </div>
            <button ref={cta} className="btn btn-paper btn-block" onClick={buy}>خرید <Icon id="arrow" className="arrow" /></button>
            <button className="add-link" onClick={add}>افزودن به سبد و ادامه خرید</button>
          </div>
          <ul className="buy-notes">
            <li><Dots size={3} />فعال در حدود {fa(p.etaMinutes)} دقیقه</li>
            <li><Dots size={3} />{sel.type === "own" ? "فقط ایمیل، نه رمز" : "ایمیل و رمز پیامک می‌شود"}</li>
            <li><Dots size={3} />گارانتی تا روز آخر</li>
          </ul>
        </div>
      </div>
      <aside className="pdp-aside" aria-hidden="true">
        <AccessPass product={p} months={sel.plan} price={price} className="buy-pass" />
      </aside>
      <div className={`buybar ${ctaVisible ? "" : "on"}`} role="region" aria-label="خرید سریع">
        <div><small>{duration(sel.plan)} • {DELIVERY[sel.type].title}</small><b className="num">{money(price)} <small>تومان</small></b></div>
        <button className="btn btn-paper" onClick={buy}>خرید</button>
      </div>
    </div>
  );
}
