"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DELIVERY, optionLabel, productById } from "@/lib/catalog";
import { DISCOUNTS, normalizeUsername, validEmail, validUsername } from "@/lib/account";
import { clubPoints, fa, money } from "@/lib/format";
import { BrandLogo, Dots, Icon } from "@/components/brand";
import { LoginFlow } from "@/components/login";
import { useAccount } from "@/components/account";
import { useStore } from "@/components/store";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, removeLine, clearCart, notify } = useStore();
  const { ready, user, placeOrder } = useAccount();
  const [emails, setEmails] = useState<Record<number, string>>({});
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState("");
  const [agree, setAgree] = useState(true);
  const [paying, setPaying] = useState(false);
  const [bad, setBad] = useState<number[]>([]);
  // Keep the login form mounted until it finishes (it may still ask a new user for their name).
  const [inFlow, setInFlow] = useState(false);
  useEffect(() => { if (ready && !user) setInFlow(true); }, [ready, user]);

  // Prefill activation emails from the profile.
  useEffect(() => {
    if (!user?.email) return;
    setEmails((e) => Object.fromEntries(cart.map((l, i) => [i, e[i] ?? (l.type === "own" ? user.email : "")])));
  }, [user?.email, cart]);

  const subtotal = cart.reduce((s, l) => s + l.price, 0);
  const rate = DISCOUNTS[applied] ?? 0;
  const discount = Math.round((subtotal * rate) / 1000) * 1000;
  const total = subtotal - discount;

  const apply = () => {
    const c = code.trim().toUpperCase();
    if (DISCOUNTS[c]) { setApplied(c); notify(`کد ${c} اعمال شد`); } else { setApplied(""); notify("این کد معتبر نیست"); }
  };

  const pay = () => {
    if (!user || inFlow) { notify("اول وارد حسابت شو"); document.getElementById("co-account")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    const ok = (t: string, v: string) => (t === "own" ? validEmail(v) : t === "username" ? validUsername(v) : true);
    const missing = cart.map((l, i) => (!ok(l.type, emails[i] ?? "") ? i : -1)).filter((i) => i >= 0);
    if (missing.length) {
      setBad(missing);
      notify(cart[missing[0]].type === "username" ? "یوزرنیم تلگرام را درست وارد کن" : "ایمیل اکانت را درست وارد کن");
      document.getElementById(`co-em-${missing[0]}`)?.focus();
      return;
    }
    if (!agree) { notify("قوانین را بپذیر"); return; }
    setPaying(true);
    // DEMO: stands in for the redirect to the payment gateway and its callback.
    setTimeout(() => {
      const o = placeOrder(cart.map((l, i) => ({ ...l,
        email: l.type === "own" ? emails[i]?.trim() : undefined,
        username: l.type === "username" ? normalizeUsername(emails[i] ?? "") : undefined })), applied);
      clearCart();
      router.push(`/orders/${o.code}`);
    }, 1400);
  };

  if (!cart.length && !paying) {
    return (
      <div className="wrap co-empty">
        <Dots size={8} />
        <h1>سبد خرید خالی است</h1>
        <p className="muted">یک ابزار انتخاب کن تا اینجا برگردیم.</p>
        <Link className="btn btn-paper" href="/#collection">دیدن همه سرویس‌ها <Icon id="arrow" className="arrow" /></Link>
      </div>
    );
  }

  const step1Done = !!user && !inFlow;
  return (
    <div className="wrap co">
      <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><span>تسویه حساب</span></nav>
      <h1 className="co-h">تسویه حساب</h1>
      <div className="co-g">
        <div className="co-steps">
          <section className={`co-step ${step1Done ? "done" : "on"}`} id="co-account">
            <header><span className="co-n">{step1Done ? "✓" : "۱"}</span><h2>حساب کاربری</h2></header>
            {!ready ? null : step1Done && user ? (
              <p className="co-who"><span>{user.name || "کاربر اک‌دراپ"}</span><span className="num muted">{fa(user.mobile)}</span></p>
            ) : (
              <LoginFlow compact onDone={() => { setInFlow(false); notify("وارد شدی"); }} />
            )}
          </section>

          <section className={`co-step ${step1Done ? "on" : "off"}`}>
            <header><span className="co-n">۲</span><h2>اطلاعات فعال‌سازی</h2></header>
            <div className="co-lines">
              {cart.map((l, i) => {
                const p = productById(l.id);
                return (
                  <div className="co-act" key={i}>
                    <div className="co-act-h"><span className="mono"><BrandLogo id={p.id} size={22} /></span><b className="en">{p.name}</b><small className="muted">{DELIVERY[l.type].title}</small></div>
                    {l.type === "own" ? (
                      <div className="fld">
                        <label htmlFor={`co-em-${i}`}>ایمیل اکانت {p.maker} تو</label>
                        <input id={`co-em-${i}`} type="email" className={`ltr ${bad.includes(i) ? "bad" : ""}`} placeholder="you@gmail.com" disabled={!step1Done}
                          value={emails[i] ?? ""} onChange={(e) => { setEmails({ ...emails, [i]: e.target.value }); setBad(bad.filter((x) => x !== i)); }} />
                        <small className="muted">فقط ایمیل. هیچ‌وقت رمز عبورت را نمی‌خواهیم.</small>
                      </div>
                    ) : l.type === "username" ? (
                      <div className="fld">
                        <label htmlFor={`co-em-${i}`}>یوزرنیم تلگرام گیرنده</label>
                        <input id={`co-em-${i}`} type="text" autoCapitalize="off" spellCheck={false} className={`ltr ${bad.includes(i) ? "bad" : ""}`} placeholder="@username" disabled={!step1Done}
                          value={emails[i] ?? ""} onChange={(e) => { setEmails({ ...emails, [i]: e.target.value }); setBad(bad.filter((x) => x !== i)); }} />
                        <small className="muted">می‌توانی آیدی خودت یا دوستت را بزنی. کد ورود و رمز نمی‌خواهیم.</small>
                      </div>
                    ) : (
                      <p className="muted co-note">{{
                        ready: "یک اکانت تازه برایت ساخته می‌شود. اطلاعات ورودش را در داشبورد و پیامک می‌بینی.",
                        code: "کد گیفت‌کارت بلافاصله بعد از پرداخت در صفحه سفارش و پیامک نمایش داده می‌شود.",
                        number: "شماره بلافاصله بعد از پرداخت در صفحه سفارش نمایش داده می‌شود و کد تأیید هم همان‌جا می‌آید.",
                      }[l.type as "ready" | "code" | "number"]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className={`co-step ${step1Done ? "on" : "off"}`}>
            <header><span className="co-n">۳</span><h2>روش پرداخت</h2></header>
            <div className="opts v co-pay">
              <button className="opt on" type="button" aria-pressed="true"><b>درگاه بانکی</b><small>همه کارت‌های عضو شتاب، پرداخت امن</small></button>
              <button className="opt" type="button" disabled><b>کیف پول اک‌دراپ</b><small>به‌زودی</small></button>
            </div>
          </section>
        </div>

        <aside className="co-sum">
          <h2>سفارش تو</h2>
          <ul className="co-items">
            {cart.map((l, i) => {
              const p = productById(l.id);
              return (
                <li key={i}>
                  <span className="mono"><BrandLogo id={p.id} size={20} /></span>
                  <div><b className="en">{p.name}</b><small>{optionLabel(p, l.plan)} • {DELIVERY[l.type].title}</small></div>
                  <div className="r"><span className="num">{money(l.price)}</span><button className="rm" onClick={() => removeLine(i)} aria-label={`حذف ${p.name}`}>حذف</button></div>
                </li>
              );
            })}
          </ul>
          <div className="co-code">
            <input placeholder="کد تخفیف" value={code} onChange={(e) => setCode(e.target.value)} aria-label="کد تخفیف" className="ltr" />
            <button onClick={apply} type="button">اعمال</button>
          </div>
          <dl className="co-totals">
            <div><dt>جمع</dt><dd className="num">{money(subtotal)}</dd></div>
            {discount > 0 && <div className="disc"><dt>تخفیف ({applied})</dt><dd className="num">−{money(discount)}</dd></div>}
            <div className="tot"><dt>قابل پرداخت</dt><dd><b className="num">{money(total)}</b> <small>تومان</small></dd></div>
          </dl>
          <p className="co-club"><Dots size={3} /><span>با این خرید <b className="num">{fa(clubPoints(total))}</b> امتیاز کلاب می‌گیری.</span></p>
          <label className="co-agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>قوانین و <a className="link" href="#">شرایط گارانتی</a> را می‌پذیرم.</span></label>
          <button className="btn btn-paper btn-block co-btn" onClick={pay} disabled={paying}>
            {paying ? "در حال اتصال به درگاه…" : <>پرداخت <span className="num">{money(total)}</span> تومان</>}
          </button>
          <ul className="co-trust">
            <li><Dots size={3} />پرداخت امن شاپرک</li>
            <li><Dots size={3} />ضمانت بازگشت وجه</li>
            <li><Dots size={3} />پشتیبانی ۹ تا ۲۴</li>
          </ul>
          <small className="muted fine">نسخه آزمایشی: درگاه هنوز وصل نیست و پرداخت شبیه‌سازی می‌شود. کد <span className="en">WELCOME</span> ده درصد تخفیف می‌دهد.</small>
        </aside>
      </div>
    </div>
  );
}
