"use client";

import { type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { DELIVERY, extrasLabel, linePrice, axisOf, deliveryTypes, etaText, guaranteeOf, isSub, optionLabel, planKeys, priceOf, productById, type Months, deliveryOf } from "@/lib/catalog";
import { fa, money } from "@/lib/format";
import { BrandLogo, Dots, Icon } from "./brand";
import { lineKey, useStore } from "./store";

const Arrow = () => <Icon id="arrow" className="arrow" />;

function ProductView() {
  const { selection, select, addSelection, close, notify } = useStore();
  const router = useRouter();
  if (!selection) return null;
  const p = productById(selection.id);
  const offers = p.plans[selection.plan] ?? {};
  const months = planKeys(p);
  const perMonth = months.map((m) => Math.min(...(Object.values(p.plans[m] ?? {}) as number[])) / Number(m));
  const { price, was } = priceOf(selection);

  return (
    <>
      <div className="s-h">
        <span className="mono"><BrandLogo id={p.id} size={22} /></span>
        <div><b className="t">{p.name}</b><small className="muted">{p.description}</small></div>
        <button className="x" onClick={close} aria-label="بستن"><Icon id="x" /></button>
      </div>
      <div className="s-b">
        <div className="grp">
          <h4>{axisOf(p)}</h4>
          <div className="opts h" style={{ "--n": months.length } as CSSProperties}>
            {months.map((m: Months, i) => {
              const save = isSub(p) && i > 0 ? Math.round((1 - perMonth[i] / perMonth[0]) * 100) : 0;
              return (
                <button key={m} className={`opt ${m === selection.plan ? "on" : ""}`} onClick={() => select({ plan: m })}>
                  {save > 0 && <span className="sv">−{save}%</span>}
                  <b>{optionLabel(p, m)}</b>
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
                <button key={t} className={`opt ${t === selection.type ? "on" : ""}`} disabled={!amount} onClick={() => select({ type: t })}>
                  <b>{deliveryOf(p, t).title}{amount ? <span className="num" style={{ fontWeight: 400, opacity: 0.7 }}> · {money(amount)}</span> : null}</b>
                  <small>{amount ? deliveryOf(p, t).detail : "برای این مدت موجود نیست"}</small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grp">
          <h4>چه می‌گیری</h4>
          <ul className="incl">
            {[...p.includes, `ضمانت: ${guaranteeOf(p)}`].map((x) => <li key={x}><Dots size={3} /><span>{x}</span></li>)}
          </ul>
        </div>
        <p className="assure">
          تحویل: <b>{etaText(p)}</b>.{" "}
          {deliveryOf(p, selection.type).detail}.
        </p>
      </div>
      <div className="s-f">
        <div className="total">
          <div>{was ? <s className="num">{money(was)}</s> : null}<b className="num">{money(price)}</b> <small>تومان</small></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => { addSelection(); close(); notify(`${p.name} به سبد اضافه شد`); }}>افزودن به سبد</button>
          <button className="btn btn-paper" onClick={() => { addSelection(); close(); router.push(`/checkout?only=${encodeURIComponent(lineKey(selection))}`); }}>همین الان بخر <Arrow /></button>
        </div>
      </div>
    </>
  );
}

function CartView() {
  const { cart, total, removeLine, close } = useStore();
  const router = useRouter();
  return (
    <>
      <div className="s-h"><b className="t" style={{ fontFamily: "inherit" }}>سبد خرید</b><button className="x" onClick={close} aria-label="بستن"><Icon id="x" /></button></div>
      <div className="s-b">
        {cart.length ? (
          <>
            <div className="lines">
              {cart.map((l, i) => {
                const p = productById(l.id);
                return (
                  <div className="ln" key={i}>
                    <span className="mono"><BrandLogo id={p.id} size={22} /></span>
                    <div className="t"><b>{p.name}</b><small>{optionLabel(p, l.plan)} · {deliveryOf(p, l.type).title}{extrasLabel(l) ? ` · ${extrasLabel(l)}` : ""}</small></div>
                    <div style={{ textAlign: "left" }}><span className="num">{money(linePrice(l))}</span><button className="rm" onClick={() => removeLine(i)}>حذف</button></div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="empty"><Dots size={8} /><br />سبد خرید خالی است.<br /><br />
            <a className="link" href="/services" onClick={close}>مشاهده مجموعه</a></div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="s-f">
          <div className="total"><small>جمع کل</small><div><b className="num">{money(total)}</b> <small>تومان</small></div></div>
          <button className="btn btn-paper btn-block" onClick={() => { close(); router.push("/checkout"); }}>تسویه حساب <Arrow /></button>
        </div>
      )}
    </>
  );
}

export function Sheet() {
  const { view, searchOpen, close } = useStore();
  return (
    <>
      <div className={`ov ${view || searchOpen ? "on" : ""}`} onClick={close} />
      <aside className={`sheet ${view ? "on" : ""}`} role="dialog" aria-modal="true" aria-hidden={!view}>
        {view === "product" && <ProductView />}
        {view === "cart" && <CartView />}
      </aside>
    </>
  );
}

export function Toast() {
  const { toast } = useStore();
  return <div className={`toast ${toast ? "on" : ""}`} role="status">{toast}</div>;
}
