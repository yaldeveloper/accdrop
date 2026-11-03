"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { CURRENT_DROP, DELIVERY, MAX_SEATS, STATIC_IP, axisOf, deliveryTypes, groupOff, ipPrice, isSub, linePrice, nounOf, optionLabel, planKeys, priceOf, type DeliveryType, type Months, type Product, type Selection } from "@/lib/catalog";
import { fa, money } from "@/lib/format";
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
  const unit = priceOf(sel);
  const seats = sel.seats ?? 1;
  const price = linePrice(sel);
  const full = (unit.was ?? unit.price) * seats + (sel.ip ? ipPrice(p, sel.plan) : 0);
  const was = full > price ? full : undefined;
  const off = groupOff(p, seats);
  const ipCost = ipPrice(p, sel.plan);

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
          <legend>برای چند نفر؟ <span className="bx-help bx-help-t">خرید گروهی = تخفیف بیشتر</span></legend>
          <div className="bx-seats" role="radiogroup" aria-label="تعداد نفرات">
            {Array.from({ length: MAX_SEATS }, (_, i) => i + 1).map((n) => {
              const o = groupOff(p, n);
              return (
                <button key={n} type="button" role="radio" aria-checked={n === seats} className={n === seats ? "on" : ""} onClick={() => setSel((s) => ({ ...s, seats: n }))}>
                  <b className="num">{fa(n)}</b><small>{n === 1 ? "فقط من" : o ? `${fa(o)}٪ تخفیف` : "نفر"}</small>
                </button>
              );
            })}
          </div>
          {seats > 1 && (
            <p className="bx-note">
              {DELIVERY[sel.type].input === "email" ? `هر نفر روی ایمیل خودش فعال می‌شود و ایمیل‌ها را در مرحله بعد می‌گیریم.` : `${fa(seats)} اکانت جدا تحویل می‌گیری.`}
              {" "}نفری <b className="num">{money(Math.round((price - (sel.ip ? ipCost : 0)) / seats / 1000) * 1000)}</b> تومان{off ? `، ${fa(off)}٪ ارزان‌تر از خرید تکی` : ""}.
            </p>
          )}
        </fieldset>
      ) : null}

      {ipCost > 0 && (
        <div className={`bx-addon ${sel.ip ? "on" : ""}`}>
          <label className="bx-ad-h">
            <input type="checkbox" checked={!!sel.ip} onChange={(e) => setSel((s) => ({ ...s, ip: e.target.checked ? "de" : undefined }))} />
            <span className="bx-ck" aria-hidden="true"><Icon id="check" /></span>
            <span className="bx-ad-t"><b>{STATIC_IP.title} خارج از کشور</b><small>یک آی‌پی ثابت فقط برای تو؛ ورود پایدار و بدون ریسک بسته شدن اکانت</small></span>
            <span className="bx-ad-p num">+{money(ipCost)}</span>
          </label>
          {sel.ip && (
            <div className="bx-ip" role="radiogroup" aria-label="کشور آی‌پی">
              {Object.entries(STATIC_IP.countries).map(([k, v]) => (
                <button key={k} type="button" role="radio" aria-checked={sel.ip === k} className={sel.ip === k ? "on" : ""} onClick={() => setSel((s) => ({ ...s, ip: k }))}>{v}</button>
              ))}
            </div>
          )}
        </div>
      )}

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
        <div><small>{optionLabel(p, sel.plan)}{seats > 1 ? ` • ${fa(seats)} نفر` : ""}{sel.ip ? " • آی‌پی ثابت" : ""}</small><b className="num">{money(price)} <small>تومان</small></b></div>
        <button className="btn btn-paper" onClick={buy}>ادامه خرید</button>
      </div>
    </div>
  );
}
