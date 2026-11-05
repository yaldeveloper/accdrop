"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DELIVERY, STATIC_IP, extrasLabel, ipPrice, linePrice, optionLabel, productById, deliveryOf, ownAsk, validOwn } from "@/lib/catalog";
import { normalizeUsername, validEmail, validUsername } from "@/lib/account";
import { fa, money } from "@/lib/format";
import { BrandLogo, Dots, Icon } from "@/components/brand";
import { LoginFlow } from "@/components/login";
import { api, useAccount } from "@/components/account";
import { useStore } from "@/components/store";
import { EMPTY_LEGAL, LegalForm, useLegal } from "@/components/legal";
import { type LegalInfo, type PayMethod } from "@/lib/billing";
import { receiveOf, warrantyOf, whenOf } from "@/lib/facts";
import { useCreditBalance } from "@/components/gift";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, removeLine, updateLine, clearCart, notify } = useStore();
  const { ready, user, placeOrder, demo } = useAccount();
  const [emails, setEmails] = useState<Record<number, string>>({});
  /** Group-buy teammates: members[line][k] is the email of seat k+2. */
  const [members, setMembers] = useState<Record<number, string[]>>({});
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState("");
  const [rate, setRate] = useState(0);
  const [agree, setAgree] = useState(true);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<PayMethod>("card");
  /** Official invoice («فاکتور رسمی»): buyer's legal details, prefilled from the profile. */
  const [wantInvoice, setWantInvoice] = useState(false);
  const saved = useLegal(!!user);
  const [legal, setLegal] = useState<LegalInfo>(EMPTY_LEGAL);
  const [badLegal, setBadLegal] = useState<keyof LegalInfo | "">("");
  useEffect(() => { if (saved) setLegal(saved); }, [saved]);
  /** AccDrop credit (redeemed gift cards): used first, the gateway gets the rest. */
  const balance = useCreditBalance(!!user);
  const [useCredit, setUseCredit] = useState(true);
  const [usdt, setUsdt] = useState(0);
  useEffect(() => { if (method === "crypto" && !usdt) api<{ rate: number }>("/api/rate").then((r) => r.rate && setUsdt(r.rate)); }, [method, usdt]);
  const [bad, setBad] = useState<number[]>([]);
  // Keep the login form mounted until it finishes (it may still ask a new user for their name).
  const [inFlow, setInFlow] = useState(false);
  useEffect(() => { if (ready && !user) setInFlow(true); }, [ready, user]);

  // Prefill activation emails from the profile.
  useEffect(() => {
    if (!user?.email) return;
    setEmails((e) => Object.fromEntries(cart.map((l, i) => [i, e[i] ?? (l.type === "own" && !productById(l.id).ask ? user.email : "")])));
  }, [user?.email, cart]);

  const subtotal = cart.reduce((s, l) => s + linePrice(l), 0);
  const discount = Math.round((subtotal * rate) / 1000) * 1000;
  const total = subtotal - discount;
  const credit = useCredit ? Math.min(balance, total) : 0;
  const due = total - credit;

  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const r = await api<{ rate: number }>(`/api/discount?code=${encodeURIComponent(c)}`);
    if (r.rate) { setApplied(c); setRate(r.rate); notify(`کد ${c} اعمال شد`); } else { setApplied(""); setRate(0); notify("این کد معتبر نیست"); }
  };

  const pay = async () => {
    if (!user || inFlow) { notify("اول وارد حسابت شو"); document.getElementById("co-account")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    const ok = (id: string, t: string, v: string) => (t === "own" ? validOwn(productById(id), v) : t === "username" ? validUsername(v) : true);
    const missing = cart.map((l, i) => (!ok(l.id, l.type, emails[i] ?? "") ? i : -1)).filter((i) => i >= 0);
    const team = cart.map((l, i) => (l.type === "own" && (l.seats ?? 1) > 1 && !Array.from({ length: l.seats! - 1 }, (_, k) => members[i]?.[k] ?? "").every(validEmail) ? i : -1)).filter((i) => i >= 0);
    if (!missing.length && team.length) {
      setBad(team.map((i) => 100 + i));
      notify("ایمیل همه اعضای گروه را درست وارد کن");
      document.getElementById(`co-mb-${team[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (missing.length) {
      setBad(missing);
      notify(cart[missing[0]].type === "username" ? "یوزرنیم تلگرام را درست وارد کن" : "ایمیل اکانت را درست وارد کن");
      document.getElementById(`co-em-${missing[0]}`)?.focus();
      return;
    }
    if (!agree) { notify("قوانین را بپذیر"); return; }
    setPaying(true);
    const r = await placeOrder(cart.map((l, i) => ({ id: l.id, plan: l.plan, type: l.type,
      email: l.type === "own" ? emails[i]?.trim() : undefined,
      username: l.type === "username" ? normalizeUsername(emails[i] ?? "") : undefined,
      seats: l.seats, ip: l.ip,
      members: l.type === "own" && (l.seats ?? 1) > 1 ? Array.from({ length: l.seats! - 1 }, (_, k) => members[i]?.[k]?.trim() ?? "") : undefined })), applied, method, wantInvoice ? legal : null, credit > 0);
    if ("error" in r) {
      setPaying(false);
      if (r.error === "bad_legal") {
        setBadLegal((r.field as keyof LegalInfo) ?? "name");
        notify("اطلاعات فاکتور رسمی را کامل کن");
        document.getElementById(`leg-${r.field ?? "name"}`)?.focus();
        return;
      }
      if (r.index !== undefined && (r.error === "bad_email" || r.error === "bad_username")) { setBad([r.index]); document.getElementById(`co-em-${r.index}`)?.focus(); }
      if (r.index !== undefined && r.error === "bad_members") setBad([100 + r.index]);
      notify(r.error === "crypto_unavailable" ? "پرداخت با ارز دیجیتال فعلاً فعال نیست؛ از درگاه بانکی استفاده کن."
        : r.error === "bad_item" ? "یکی از اقلام سبد دیگر موجود نیست. حذفش کن و دوباره امتحان کن." : r.error === "number_unavailable" ? "شماره این کشور همین الان تمام شد. از صفحه شماره مجازی کشور دیگری انتخاب کن." : r.error === "out_of_stock" ? "موجودی یکی از اقلام سبد همین الان تمام شد. حذفش کن یا کمی بعد دوباره امتحان کن." : r.error === "unauthorized" ? "اول وارد حسابت شو" : "ثبت سفارش انجام نشد. دوباره امتحان کن.");
      return;
    }
    clearCart();
    if (r.payUrl.startsWith("/")) router.push(r.payUrl); else window.location.href = r.payUrl;
  };

  if (!cart.length && !paying) {
    return (
      <div className="wrap co-empty">
        <Dots size={8} />
        <h1>سبد خرید خالی است</h1>
        <p className="muted">یک ابزار انتخاب کن تا اینجا برگردیم.</p>
        <Link className="btn btn-paper" href="/services">دیدن همه سرویس‌ها <Icon id="arrow" className="arrow" /></Link>
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
            <header><span className="co-n">۲</span><h2>{cart.some((l) => l.type === "own" || l.type === "username") ? "اطلاعات فعال‌سازی" : "چه چیزی تحویل می‌گیری"}</h2></header>
            <div className="co-lines">
              {cart.map((l, i) => {
                const p = productById(l.id);
                return (
                  <div className="co-act" key={i}>
                    <div className="co-act-h"><span className="mono"><BrandLogo id={p.id} size={22} /></span><b className="en">{p.name}</b><small className="muted">{deliveryOf(p, l.type).title}</small></div>
                    {l.type === "own" ? (
                      <div className="fld">
                        <label htmlFor={`co-em-${i}`}>{ownAsk(p).label}</label>
                        <input id={`co-em-${i}`} type={p.ask ? "text" : "email"} className={`ltr ${bad.includes(i) ? "bad" : ""}`} placeholder={ownAsk(p).placeholder} disabled={!step1Done}
                          value={emails[i] ?? ""} onChange={(e) => { setEmails({ ...emails, [i]: e.target.value }); setBad(bad.filter((x) => x !== i)); }} />
                        <small className="muted">{ownAsk(p).hint}</small>
                        {(l.seats ?? 1) > 1 && (
                          <div className={`co-team ${bad.includes(100 + i) ? "bad" : ""}`} id={`co-mb-${i}`}>
                            <b>ایمیل بقیه اعضای گروه</b>
                            {Array.from({ length: l.seats! - 1 }, (_, k) => (
                              <input key={k} type="email" className="ltr" placeholder={`member${k + 2}@gmail.com`} disabled={!step1Done} aria-label={`ایمیل نفر ${fa(k + 2)}`}
                                value={members[i]?.[k] ?? ""} onChange={(e) => { const next = [...(members[i] ?? [])]; next[k] = e.target.value; setMembers({ ...members, [i]: next }); setBad(bad.filter((x) => x !== 100 + i)); }} />
                            ))}
                            <small className="muted">هر نفر یک اشتراک جدا روی ایمیل خودش می‌گیرد.</small>
                          </div>
                        )}
                      </div>
                    ) : l.type === "username" ? (
                      <div className="fld">
                        <label htmlFor={`co-em-${i}`}>یوزرنیم تلگرام گیرنده</label>
                        <input id={`co-em-${i}`} type="text" autoCapitalize="off" spellCheck={false} className={`ltr ${bad.includes(i) ? "bad" : ""}`} placeholder="@username" disabled={!step1Done}
                          value={emails[i] ?? ""} onChange={(e) => { setEmails({ ...emails, [i]: e.target.value }); setBad(bad.filter((x) => x !== i)); }} />
                        <small className="muted">می‌توانی آیدی خودت یا دوستت را بزنی. کد ورود و رمز نمی‌خواهیم.</small>
                      </div>
                    ) : (
                      <p className="muted co-note"><b>{receiveOf(p, l.type).title}</b>، {whenOf(p, l.type)}. {receiveOf(p, l.type).detail}؛ در صفحه سفارش و پیامک. چیزی لازم نیست وارد کنی.</p>
                    )}
                    {(() => { const w = warrantyOf(p, l.plan); return <p className={`co-war w-${w.level}`}><Icon id="shield" /><span><b>{w.label}</b> {w.level === "none" || w.level === "short" ? w.note : ""}</span></p>; })()}
                  </div>
                );
              })}
            </div>
          </section>

          {cart.some((l) => ipPrice(productById(l.id), l.plan) > 0) && (
            <section className={`co-step ${step1Done ? "on" : "off"}`}>
              <header><span className="co-n">۳</span><h2>افزودنی‌ها <small className="muted">اختیاری</small></h2></header>
              <div className="co-addons">
                {cart.map((l, i) => {
                  const p = productById(l.id), cost = ipPrice(p, l.plan);
                  if (!cost) return null;
                  return (
                    <div key={i} className={`co-ad ${l.ip ? "on" : ""}`}>
                      <label className="co-ad-h">
                        <input type="checkbox" checked={!!l.ip} disabled={!step1Done} onChange={(e) => updateLine(i, { ip: e.target.checked ? "de" : undefined })} />
                        <span className="co-ck" aria-hidden="true"><Icon id="check" /></span>
                        <span><b>{STATIC_IP.title} برای <span className="en">{p.name}</span></b><small>یک آی‌پی خارج فقط برای تو؛ ورود پایدار و کمتر بسته شدن اکانت. مشخصات اتصال بعد از فعال‌سازی در صفحه سفارش.</small></span>
                        <span className="num co-ad-p">+{money(cost)}</span>
                      </label>
                      {l.ip && (
                        <div className="co-ip" role="radiogroup" aria-label="کشور">
                          {Object.entries(STATIC_IP.countries).map(([k, v]) => (
                            <button key={k} type="button" role="radio" aria-checked={l.ip === k} className={l.ip === k ? "on" : ""} onClick={() => updateLine(i, { ip: k })}>{v}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className={`co-step ${step1Done ? "on" : "off"}`}>
            <header><span className="co-n">{cart.some((l) => ipPrice(productById(l.id), l.plan) > 0) ? "۴" : "۳"}</span><h2>روش پرداخت</h2></header>
            <div className="opts v co-pay">
              <button className={`opt ${method === "card" ? "on" : ""}`} type="button" aria-pressed={method === "card"} onClick={() => setMethod("card")}><span className="opt-logo ic"><Icon id="lock" /></span><b>کارت بانکی</b><small>همه کارت‌های عضو شتاب</small></button>
              <button className={`opt ${method === "crypto" ? "on" : ""}`} type="button" aria-pressed={method === "crypto"} onClick={() => setMethod("crypto")}>
                <span className="opt-logo ic usdt">₮</span><b>ارز دیجیتال</b><small>تتر، بیت‌کوین و بیشتر{method === "crypto" && usdt ? <> • <span className="num">{fa(Math.ceil((due / usdt) * 100) / 100)}</span> تتر (هر تتر <span className="num">{money(usdt)}</span> تومان)</> : null}</small>
              </button>
            </div>
          </section>
          <section className={`co-step co-inv ${step1Done ? "on" : "off"} ${wantInvoice ? "open" : ""}`}>
            <label className="co-inv-h">
              <input type="checkbox" checked={wantInvoice} onChange={(e) => setWantInvoice(e.target.checked)} disabled={!step1Done} />
              <span className="co-ck" aria-hidden="true"><Icon id="check" /></span>
              <span><b>فاکتور رسمی می‌خواهم</b><small>به نام شرکت یا شخص، با کد اقتصادی، برای حسابداری</small></span>
            </label>
            {wantInvoice && <LegalForm value={legal} onChange={(v) => { setLegal(v); setBadLegal(""); }} bad={badLegal} />}
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
                  <div><b className="en">{p.name}</b><small>{optionLabel(p, l.plan)} • {deliveryOf(p, l.type).title}</small>{extrasLabel(l) && <small className="co-x">{extrasLabel(l)}</small>}</div>
                  <div className="r"><span className="num">{money(linePrice(l))}</span><button className="rm" onClick={() => removeLine(i)} aria-label={`حذف ${p.name}`}>حذف</button></div>
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
            {balance > 0 && (
              <div className="disc co-credit"><dt><label><input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} /> اعتبار اک‌دراپ <small className="muted">(<span className="num">{money(balance)}</span>)</small></label></dt><dd className="num">{credit > 0 ? `−${money(credit)}` : "—"}</dd></div>
            )}
            <div className="tot"><dt>قابل پرداخت</dt><dd><b className="num">{money(due)}</b> <small>تومان</small></dd></div>
          </dl>
          <label className="co-agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span><Link className="link" href="/terms">قوانین</Link> و <Link className="link" href="/guarantee">گارانتی هر محصول</Link> را خواندم و می‌پذیرم.</span></label>
          <button className="btn btn-paper btn-block co-btn" onClick={pay} disabled={paying}>
            {paying ? "در حال اتصال به درگاه…" : due === 0 && credit > 0 ? <>پرداخت با اعتبار اک‌دراپ</> : method === "crypto" ? <>پرداخت با ارز دیجیتال</> : <>پرداخت <span className="num">{money(due)}</span> تومان</>}
          </button>
          <div className="co-bar" aria-hidden="true">
            <div><small>قابل پرداخت</small><b className="num">{money(due)} <small>تومان</small></b></div>
            <button className="btn btn-paper" onClick={pay} disabled={paying} tabIndex={-1}>{paying ? "…" : "پرداخت"}</button>
          </div>
          {demo.gateway && <small className="muted fine">درگاه آزمایشی فعال است؛ پولی کم نمی‌شود.</small>}
        </aside>
      </div>
    </div>
  );
}
