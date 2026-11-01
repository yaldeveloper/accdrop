"use client";

import { useState, type CSSProperties } from "react";
import { DELIVERY, deliveryTypes, planKeys, priceOf, productById, type Months } from "@/lib/catalog";
import { clubPoints, duration, fa, money } from "@/lib/format";
import { Dots, Icon } from "./brand";
import { useStore } from "./store";

const Arrow = () => <Icon id="arrow" className="arrow" />;

function ProductView() {
  const { selection, select, addSelection, setView, close, notify } = useStore();
  if (!selection) return null;
  const p = productById(selection.id);
  const offers = p.plans[selection.plan] ?? {};
  const months = planKeys(p);
  const perMonth = months.map((m) => Math.min(...(Object.values(p.plans[m] ?? {}) as number[])) / Number(m));
  const { price, was } = priceOf(selection);

  return (
    <>
      <div className="s-h">
        <span className="mono">{p.monogram}</span>
        <div><b className="t">{p.name}</b><small className="muted">{p.description}</small></div>
        <button className="x" onClick={close} aria-label="بستن"><Icon id="x" /></button>
      </div>
      <div className="s-b">
        <div className="grp">
          <h4>DURATION</h4>
          <div className="opts h" style={{ "--n": months.length } as CSSProperties}>
            {months.map((m: Months, i) => {
              const save = i > 0 ? Math.round((1 - perMonth[i] / perMonth[0]) * 100) : 0;
              return (
                <button key={m} className={`opt ${m === selection.plan ? "on" : ""}`} onClick={() => select({ plan: m })}>
                  {save > 0 && <span className="sv">−{save}%</span>}
                  <b>{duration(m)}</b>
                  <small className="num">{money(Math.min(...(Object.values(p.plans[m] ?? {}) as number[])))} تومان</small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grp">
          <h4>DELIVERY</h4>
          <div className="opts v">
            {deliveryTypes(p).map((t) => {
              const amount = offers[t];
              return (
                <button key={t} className={`opt ${t === selection.type ? "on" : ""}`} disabled={!amount} onClick={() => select({ type: t })}>
                  <b>{DELIVERY[t].title}{amount ? <span className="num" style={{ fontWeight: 400, opacity: 0.7 }}> · {money(amount)}</span> : null}</b>
                  <small>{amount ? DELIVERY[t].detail : "برای این مدت موجود نیست"}</small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grp">
          <h4>INCLUDED</h4>
          <ul className="incl">
            {[...p.includes, "گارانتی شیلد تا آخرین روز اشتراک"].map((x) => <li key={x}><Dots size={3} /><span>{x}</span></li>)}
          </ul>
        </div>
        <p className="assure">
          تحویل حدود <b>{fa(p.etaMinutes)} دقیقه</b> پس از پرداخت.{" "}
          {selection.type === "own" ? "فقط ایمیل اکانتت لازم است؛ رمز عبور هرگز پرسیده نمی‌شود." : "اطلاعات ورود به ایمیل و پیامکت ارسال می‌شود."}
        </p>
      </div>
      <div className="s-f">
        <div className="total">
          <div>{was ? <s className="num">{money(was)}</s> : null}<b className="num">{money(price)}</b> <small>تومان</small></div>
          <small><span className="num">{fa(clubPoints(price))}</span> امتیاز کلاب</small>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => { addSelection(); close(); notify(`${p.name} به سبد اضافه شد`); }}>افزودن به سبد</button>
          <button className="btn btn-paper" onClick={() => { addSelection(); setView("checkout"); }}>خرید <Arrow /></button>
        </div>
      </div>
    </>
  );
}

function CartView() {
  const { cart, total, removeLine, setView, close } = useStore();
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
                    <span className="mono">{p.monogram}</span>
                    <div className="t"><b>{p.name}</b><small>{duration(l.plan)} · {DELIVERY[l.type].title}</small></div>
                    <div style={{ textAlign: "left" }}><span className="num">{money(l.price)}</span><button className="rm" onClick={() => removeLine(i)}>حذف</button></div>
                  </div>
                );
              })}
            </div>
            <p className="assure">با این خرید <b className="num">{fa(clubPoints(total))}</b> امتیاز کلاب می‌گیری.</p>
          </>
        ) : (
          <div className="empty"><Dots size={8} /><br />سبد خرید خالی است.<br /><br />
            <a className="link" href="#collection" onClick={close}>مشاهده مجموعه</a></div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="s-f">
          <div className="total"><small>جمع کل</small><div><b className="num">{money(total)}</b> <small>تومان</small></div></div>
          <button className="btn btn-paper btn-block" onClick={() => setView("checkout")}>ادامه <Arrow /></button>
        </div>
      )}
    </>
  );
}

function CheckoutView() {
  const { cart, total, setView, close, completeOrder, notify } = useStore();
  const needsEmail = cart.some((l) => l.type === "own");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bad, setBad] = useState<"email" | "phone" | null>(null);

  const pay = () => {
    if (needsEmail && !/^\S+@\S+\.\S+$/.test(email)) { setBad("email"); notify("ایمیل را درست وارد کن"); return; }
    if (!/^0?9\d{9}$/.test(phone.replace(/\D/g, ""))) { setBad("phone"); notify("شماره موبایل را درست وارد کن"); return; }
    completeOrder();
  };

  return (
    <>
      <div className="s-h">
        <button className="x" style={{ margin: 0 }} onClick={() => setView("cart")} aria-label="بازگشت"><Icon id="back" /></button>
        <b className="t" style={{ fontFamily: "inherit" }}>تکمیل سفارش</b>
        <button className="x" onClick={close} aria-label="بستن"><Icon id="x" /></button>
      </div>
      <div className="steps"><i className="on" /><i className="on" /><i /></div>
      <form className="s-b" noValidate onSubmit={(e) => { e.preventDefault(); pay(); }}>
        {needsEmail && (
          <div className="fld">
            <label htmlFor="em">ایمیل اکانتی که اشتراک رویش فعال شود</label>
            <input id="em" type="email" className={`ltr ${bad === "email" ? "bad" : ""}`} placeholder="you@gmail.com" value={email} onChange={(e) => { setEmail(e.target.value); setBad(null); }} />
            <small>فقط ایمیل. هرگز رمز عبور نمی‌خواهیم.</small>
          </div>
        )}
        <div className="fld">
          <label htmlFor="ph">شماره موبایل</label>
          <input id="ph" type="tel" inputMode="numeric" className={`ltr ${bad === "phone" ? "bad" : ""}`} placeholder="09xx xxx xxxx" value={phone} onChange={(e) => { setPhone(e.target.value); setBad(null); }} />
          <small>کد پیگیری و اطلاعات تحویل پیامک می‌شود.</small>
        </div>
        <div className="lines">
          {cart.map((l, i) => (
            <div className="ln" key={i}><div className="t"><b>{productById(l.id).name}</b><small>{duration(l.plan)}</small></div><span className="num">{money(l.price)}</span></div>
          ))}
        </div>
      </form>
      <div className="s-f">
        <div className="total"><small>قابل پرداخت</small><div><b className="num">{money(total)}</b> <small>تومان</small></div></div>
        <button className="btn btn-paper btn-block" onClick={pay}>پرداخت امن</button>
        <small className="muted" style={{ textAlign: "center", fontSize: 11 }}>درگاه پرداخت هنوز وصل نشده و این مرحله شبیه‌سازی است.</small>
      </div>
    </>
  );
}

function DoneView() {
  const { orderCode, close } = useStore();
  return (
    <>
      <div className="s-h"><span /><button className="x" onClick={close} aria-label="بستن"><Icon id="x" /></button></div>
      <div className="steps"><i className="on" /><i className="on" /><i className="on" /></div>
      <div className="s-b">
        <div className="done"><Dots size={12} /><h3>سفارشت ثبت شد.</h3><p>اشتراکت حدود ده دقیقه دیگر فعال می‌شود. هر مرحله را پیامک می‌کنیم.</p><span className="code">{orderCode}</span></div>
      </div>
      <div className="s-f"><a className="btn btn-ghost btn-block" href="#shield" onClick={close}>پیگیری سفارش</a></div>
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
        {view === "checkout" && <CheckoutView />}
        {view === "done" && <DoneView />}
      </aside>
    </>
  );
}

export function Toast() {
  const { toast } = useStore();
  return <div className={`toast ${toast ? "on" : ""}`} role="status">{toast}</div>;
}
