"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DELIVERY, MAX_QTY, MAX_SEATS, axisOf, deliveryTypes, dropOf, groupOff, isSub, linePrice, minPrice, nounOf, optionLabel, planKeys, priceOf, variantsOf, type DeliveryType, type Months, type Product, type Selection, deliveryOf } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { INSTALLMENTS, canInstall, installment } from "@/lib/billing";
import { api } from "./account";
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
  const group = seats > 1 && !p.bulk?.length;
  const maxOff = p.group?.length ? p.group[p.group.length - 1][1] : 0;
  /** Group buy where every member pays their own share («دنگ») instead of one person paying for all. */
  const [dong, setDong] = useState(true);
  const [making, setMaking] = useState(false);
  const share = Math.round(price / seats / 1000) * 1000;
  const bulk = !!p.bulk?.length;
  /** Wholesale: units ready for instant delivery per option (null = unknown or refilled by a supplier). */
  const [stock, setStock] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    if (!bulk) return;
    fetch(`/api/stock?id=${p.id}`).then((r) => r.json()).then((j) => setStock(j.stock ?? null)).catch(() => {});
  }, [bulk, p.id]);
  const left = stock ? stock[sel.plan] ?? 0 : MAX_QTY;
  const soldOut = bulk && left < 1;
  const tooMany = bulk && seats > left;

  // Renewal links from the dashboard carry ?plan=&type=.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const plan = q.get("plan") as Months | null, type = q.get("type") as DeliveryType | null;
    if (plan && type && p.plans[plan]?.[type]) setSel((s) => ({ ...s, plan, type }));
    const seats = Number(q.get("seats"));
    if (p.group?.length && seats > 1 && seats <= MAX_SEATS) setSel((s) => ({ ...s, seats }));
    if (p.bulk?.length && seats > 1 && seats <= MAX_QTY) setSel((s) => ({ ...s, seats }));
    if (p.group?.length && q.get("dong") === "1") { setDong(true); setSel((s) => ({ ...s, seats: Math.max(2, s.seats ?? 1) })); }
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
  const startDong = async () => {
    setMaking(true);
    const r = await api<{ code: string }>("/api/splits", { body: { id: p.id, plan: sel.plan, type: sel.type, seats } });
    if (r.code) { router.push(`/dong/${r.code}?new=1`); return; }
    setMaking(false);
    if (r.error === "unauthorized") { router.push(`/login?next=${encodeURIComponent(`${location.pathname}?plan=${sel.plan}&type=${sel.type}&seats=${seats}&dong=1#buy`)}`); return; }
    notify("ساخت گروه انجام نشد. دوباره امتحان کن.");
  };
  const setQty = (n: number) => setSel((s) => ({ ...s, seats: Math.min(MAX_QTY, Math.max(1, Math.trunc(n) || 1)) }));
  const buy = () => { if (soldOut || tooMany) return; if (group && dong) { startDong(); return; } addLine(sel); router.push("/checkout"); };
  const add = () => (soldOut || tooMany) ? undefined : notify(addLine(sel) ? `${p.name} به سبد اضافه شد` : "این مورد از قبل در سبد هست");

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

      {months.length > 1 && <fieldset className="bx-g">
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
      </fieldset>}

      {types.length > 1 ? <fieldset className="bx-g">
        <legend>نحوه تحویل {types.length > 1 && <a href="#delivery" className="bx-help">فرقشان چیست؟</a>}</legend>
        {types.map((t) => {
          const amount = offers[t];
          const on = t === sel.type;
          return (
            <label key={t} className={`bx-o bx-o2 ${on ? "on" : ""} ${amount ? "" : "dis"}`}>
              <input type="radio" name="type" checked={on} disabled={!amount} onChange={() => choose({ type: t })} />
              <span className="bx-r" aria-hidden="true" />
              <span className="bx-l"><b>{deliveryOf(p, t).title}</b><small>{amount ? deliveryOf(p, t).detail : "برای این گزینه موجود نیست"}</small></span>
              {types.length > 1 && amount ? <span className="bx-p num">{money(priceOf({ id: p.id, plan: sel.plan, type: t }).price)}</span> : null}
            </label>
          );
        })}
      </fieldset> : (
        <p className="bx-one"><span>{months.length === 1 ? <>{optionLabel(p, sel.plan)} • </> : null}{deliveryOf(p, sel.type).title}</span><small>{deliveryOf(p, sel.type).detail}</small></p>
      )}

      {bulk ? (
        <fieldset className="bx-g">
          <legend>تعداد</legend>
          <div className="bx-who" role="radiogroup" aria-label="خرید تکی یا عمده">
            <button type="button" role="radio" aria-checked={seats === 1} className={seats === 1 ? "on" : ""} onClick={() => setQty(1)}>
              <b>تکی</b><small>یک {nounOf(p)}</small>
            </button>
            <button type="button" role="radio" aria-checked={seats > 1} className={seats > 1 ? "on" : ""} onClick={() => setQty(Math.max(p.bulk![0][0], seats))}>
              <b>عمده</b><small>تا {fa(p.bulk![p.bulk!.length - 1][1])}٪ ارزان‌تر هر عدد</small>
            </button>
          </div>
          {seats > 1 && (
            <div className="bx-grp">
              <div className="bx-step">
                <span>تعداد {nounOf(p)}</span>
                <div>
                  <button type="button" aria-label="یکی کمتر" disabled={seats <= 2} onClick={() => setQty(seats - 1)}>−</button>
                  <input className="bx-qty num" inputMode="numeric" aria-label="تعداد" value={fa(seats)}
                    onChange={(e) => setQty(Number(e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "")))} />
                  <button type="button" aria-label="یکی بیشتر" disabled={seats >= Math.min(MAX_QTY, left)} onClick={() => setQty(seats + 1)}>+</button>
                </div>
              </div>
              <ol className="bx-tiers bx-tiers-q">{p.bulk!.map(([n, o]) => (
                <li key={n} className={seats >= n ? "on" : ""}><button type="button" onClick={() => setQty(n)}><b className="num">{fa(n)}+ عدد</b><small>{fa(o)}٪ تخفیف</small></button></li>
              ))}</ol>
              <p className="bx-note">هر عدد <b className="num">{money(share)}</b> تومان{off ? `، ${fa(off)}٪ کمتر از خرید تکی` : ""}. همه اکانت‌ها با هم و خودکار تحویل می‌شوند، هر کدام در یک خط.</p>
            </div>
          )}
          {stock && <p className={`bx-stock ${soldOut || tooMany ? "bad" : ""}`}>{soldOut ? "این کشور فعلاً ناموجود است." : tooMany ? `فقط ${fa(left)} عدد برای تحویل فوری موجود است.` : left >= MAX_QTY ? "موجود برای تحویل فوری" : `${fa(left)} عدد موجود برای تحویل فوری`}</p>}
        </fieldset>
      ) : null}

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
              <div className="bx-pay" role="radiogroup" aria-label="پرداخت گروه">
                <button type="button" role="radio" aria-checked={dong} className={dong ? "on" : ""} onClick={() => setDong(true)}>
                  <b>دنگی</b><small>هر نفر سهم خودش را می‌دهد</small>
                </button>
                <button type="button" role="radio" aria-checked={!dong} className={!dong ? "on" : ""} onClick={() => setDong(false)}>
                  <b>من حساب می‌کنم</b><small>یک‌جا برای همه</small>
                </button>
              </div>
              <p className="bx-note">
                {dong ? <>یک لینک می‌گیری که در گروه تلگرام یا واتساپ می‌فرستی. هر نفر با حساب خودش وارد می‌شود و فقط سهم خودش را می‌دهد. قیمت تا {fa(72)} ساعت قفل است و وقتی همه پرداخت کردند، اشتراک‌ها با هم فعال می‌شوند.</>
                  : DELIVERY[sel.type].input === "email" ? "هر نفر یک اشتراک جدا روی ایمیل خودش می‌گیرد؛ ایمیل‌ها را در مرحله پرداخت می‌گیریم." : `${fa(seats)} اکانت جدا تحویل می‌گیری.`}
                {" "}نفری <b className="num">{money(share)}</b> تومان{off ? `، ${fa(off)}٪ کمتر از خرید تکی` : ""}.
              </p>
            </div>
          )}
        </fieldset>
      ) : null}

      <div className="bx-sum">
        {group && dong
          ? <div className="bx-row"><span>سهم هر نفر</span><span>{unit.price > share ? <s className="num">{money(unit.price)}</s> : null}<b className="num">{money(share)}</b> <small>تومان</small></span></div>
          : <div className="bx-row"><span>مبلغ قابل پرداخت</span><span>{was ? <s className="num">{money(was)}</s> : null}<b className="num">{money(price)}</b> <small>تومان</small></span></div>}
      </div>
      {!(group && dong) && canInstall(price) && (
        <div className="bx-inst">
          <img src="/pay/snapppay.svg" alt="اسنپ‌پی" width={34} height={34} />
          <span><b>یا <span className="num">{fa(INSTALLMENTS.parts)}</span> قسط <span className="num">{money(installment(price))}</span> تومانی</b><small>با اسنپ‌پی، بدون کارمزد و ضامن</small></span>
        </div>
      )}

      <button ref={cta} className="btn btn-paper btn-block bx-cta" onClick={buy} disabled={making || soldOut || tooMany}>{group && dong ? (making ? "در حال ساخت گروه…" : "ساخت گروه و گرفتن لینک") : soldOut ? "ناموجود" : "ادامه خرید"} <Icon id="arrow" className="arrow" /></button>
      {!(group && dong) && <button className="add-link" onClick={add}>افزودن به سبد خرید</button>}

      <ul className="bx-trust">
        <li><Icon id="shield" /><span>ضمانت<br />بازگشت وجه</span></li>
        <li><Icon id="user" /><span>{isSub(p) ? <>روی اکانت<br />خودت</> : <>تحویل در<br />حساب کاربری</>}</span></li>
        <li><Icon id="chat" /><span>پشتیبانی<br />تا ۱۲ شب</span></li>
      </ul>

      <div className={`buybar ${ctaVisible ? "" : "on"}`} role="region" aria-label="خرید سریع">
        <div><small>{optionLabel(p, sel.plan)}{seats > 1 ? (bulk ? ` • ${fa(seats)} عدد` : ` • ${fa(seats)} نفر${dong ? " • دنگی" : ""}`) : ""}</small><b className="num">{money(group && dong ? share : price)} <small>تومان{group && dong ? " / نفر" : ""}</small></b></div>
        <button className="btn btn-paper" onClick={buy} disabled={making || soldOut || tooMany}>{group && dong ? "ساخت گروه" : "ادامه خرید"}</button>
      </div>
    </div>
  );
}
