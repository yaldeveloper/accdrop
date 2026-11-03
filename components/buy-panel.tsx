"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DELIVERY, MAX_SEATS, axisOf, deliveryTypes, dropOf, groupOff, isSub, linePrice, minPrice, nounOf, optionLabel, planKeys, priceOf, variantsOf, type DeliveryType, type Months, type Product, type Selection } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { fa, money } from "@/lib/format";
import { Icon } from "./brand";
import { useStore } from "./store";

function initial(p: Product): Selection {
  const d = dropOf(p.id);
  if (d) return { id: p.id, plan: d.plan, type: d.type };
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
  const unit = priceOf(sel);
  const seats = sel.seats ?? 1;
  const price = linePrice(sel);
  const full = (unit.was ?? unit.price) * seats;
  const was = full > price ? full : undefined;
  const off = groupOff(p, seats);
  const variants = variantsOf(p);
  const group = seats > 1;
  const maxOff = p.group?.length ? p.group[p.group.length - 1][1] : 0;

  // Renewal links from the dashboard carry ?plan=&type=.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const plan = q.get("plan") as Months | null, type = q.get("type") as DeliveryType | null;
    if (plan && type && p.plans[plan]?.[type]) setSel((s) => ({ ...s, plan, type }));
    const seats = Number(q.get("seats"));
    if (p.group?.length && seats > 1 && seats <= MAX_SEATS) setSel((s) => ({ ...s, seats }));
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
  const add = () => notify(addLine(sel) ? `${p.name} به سبد اضافه شد` : "این مورد از قبل در سبد هست");

  return (
    <div className="bx" id="buy">
      <h2 className="bx-t">انتخاب {nounOf(p)}</h2>

      {variants.length > 1 && (
        <fieldset className="bx-g">
          <legend>نسخه</legend>
          <div className="bx-var" style={{ "--n": variants.length } as CSSProperties}>
            {variants.map((v) => (
              <Link key={v.id} href={productHref(v)} className={v.id === p.id ? "on" : ""} aria-current={v.id === p.id ? "page" : undefined} scroll={false}>
                <b className="en">{v.tier ?? v.name}</b><small className="num">از {money(minPrice(v))}</small>
              </Link>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="bx-g">
        <legend>{axisOf(p)}</legend>
        <div className={`bx-seg ${months.length > 3 ? "bx-seg4" : ""}`} style={{ "--n": Math.min(months.length, 4) } as CSSProperties}>
          {months.map((m, i) => {
            const save = isSub(p) && i > 0 ? Math.round((1 - perMonth[i] / perMonth[0]) * 100) : 0;
            const on = m === sel.plan;
            const t = p.plans[m]?.[sel.type] ? sel.type : (Object.keys(p.plans[m] ?? {})[0] as DeliveryType);
            const pr = priceOf({ id: p.id, plan: m, type: t }).price;
            return (
              <label key={m} className={`bx-s ${on ? "on" : ""}`}>
                <input type="radio" name="plan" checked={on} onChange={() => choose({ plan: m })} />
                {save > 0 && <span className="bx-tag">{fa(save)}٪ ارزان‌تر</span>}
                <b>{optionLabel(p, m)}</b>
                <small className="num">{money(pr)}</small>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="bx-g">
        <legend>نحوه تحویل {types.length > 1 && <a href="#delivery" className="bx-help">فرقشان چیست؟</a>}</legend>
        {types.map((t) => {
          const amount = offers[t];
          const on = t === sel.type;
          return (
            <label key={t} className={`bx-o bx-o2 ${on ? "on" : ""} ${amount ? "" : "dis"}`}>
              <input type="radio" name="type" checked={on} disabled={!amount} onChange={() => choose({ type: t })} />
              <span className="bx-r" aria-hidden="true" />
              <span className="bx-l"><b>{DELIVERY[t].title}</b><small>{amount ? DELIVERY[t].detail : "برای این گزینه موجود نیست"}</small></span>
              {types.length > 1 && amount ? <span className="bx-p num">{money(priceOf({ id: p.id, plan: sel.plan, type: t }).price)}</span> : null}
            </label>
          );
        })}
      </fieldset>

      {p.group?.length ? (
        <fieldset className="bx-g">
          <legend>برای چه کسی؟</legend>
          <div className="bx-who" role="radiogroup" aria-label="خرید تکی یا گروهی">
            <button type="button" role="radio" aria-checked={!group} className={!group ? "on" : ""} onClick={() => setSel((s) => ({ ...s, seats: 1 }))}>
              <b>فقط خودم</b><small>یک اشتراک</small>
            </button>
            <button type="button" role="radio" aria-checked={group} className={group ? "on" : ""} onClick={() => setSel((s) => ({ ...s, seats: Math.max(2, s.seats ?? 1) }))}>
              <b>خرید گروهی</b><small>تا {fa(maxOff)}٪ ارزان‌تر برای هر نفر</small>
            </button>
          </div>
          {group && (
            <div className="bx-grp">
              <div className="bx-step">
                <span>تعداد نفرات</span>
                <div>
                  <button type="button" aria-label="یک نفر کمتر" disabled={seats <= 2} onClick={() => setSel((s) => ({ ...s, seats: Math.max(2, (s.seats ?? 2) - 1) }))}>−</button>
                  <b className="num" aria-live="polite">{fa(seats)} نفر</b>
                  <button type="button" aria-label="یک نفر بیشتر" disabled={seats >= MAX_SEATS} onClick={() => setSel((s) => ({ ...s, seats: Math.min(MAX_SEATS, (s.seats ?? 1) + 1) }))}>+</button>
                </div>
              </div>
              <ol className="bx-tiers">{p.group.map(([n, o]) => <li key={n} className={seats >= n ? "on" : ""}><b className="num">{fa(n)}+ نفر</b><small>{fa(o)}٪ تخفیف</small></li>)}</ol>
              <p className="bx-note">
                {DELIVERY[sel.type].input === "email" ? "هر نفر یک اشتراک جدا روی ایمیل خودش می‌گیرد؛ ایمیل‌ها را در مرحله پرداخت می‌گیریم." : `${fa(seats)} اکانت جدا تحویل می‌گیری.`}
                {" "}نفری <b className="num">{money(Math.round(price / seats / 1000) * 1000)}</b> تومان{off ? `، ${fa(off)}٪ کمتر از خرید تکی` : ""}.
              </p>
            </div>
          )}
        </fieldset>
      ) : null}

      <div className="bx-sum">
        <div className="bx-row"><span>مبلغ قابل پرداخت</span><span>{was ? <s className="num">{money(was)}</s> : null}<b className="num">{money(price)}</b> <small>تومان</small></span></div>
        <div className="bx-row sub"><span>تحویل</span><span>{isSub(p) ? "روی اکانت خودت، بعد از پرداخت" : "در حساب کاربری و پیامک، بعد از پرداخت"}</span></div>
      </div>

      <button ref={cta} className="btn btn-paper btn-block bx-cta" onClick={buy}>ادامه خرید <Icon id="arrow" className="arrow" /></button>
      <button className="add-link" onClick={add}>افزودن به سبد خرید</button>

      <ul className="bx-trust">
        <li><Icon id="lock" />پرداخت از درگاه بانکی رسمی؛ بدون کارت ارزی</li>
        <li><Icon id="shield" />اگر فعال نشد، کل مبلغ برمی‌گردد</li>
      </ul>

      <div className={`buybar ${ctaVisible ? "" : "on"}`} role="region" aria-label="خرید سریع">
        <div><small>{optionLabel(p, sel.plan)}{seats > 1 ? ` • ${fa(seats)} نفر` : ""}</small><b className="num">{money(price)} <small>تومان</small></b></div>
        <button className="btn btn-paper" onClick={buy}>ادامه خرید</button>
      </div>
    </div>
  );
}
