"use client";

import "@/app/gift/gift.css";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GIFT_AMOUNTS, GIFT_LIMITS, GIFT_THEMES, giftAmountLabel, giftPath, showCode, themeById, type GiftTheme, type GiftView, type SentGift } from "@/lib/gift";
import { normalizeMobile, validMobile } from "@/lib/account";
import { fa, faDate, money } from "@/lib/format";
import type { PayMethod } from "@/lib/billing";
import { Dots, Icon, Wordmark } from "./brand";
import { LoginFlow } from "./login";
import { api, useAccount } from "./account";
import { useStore } from "./store";

const themeVars = (t: GiftTheme) => ({ "--g1": t.bg[0], "--g2": t.bg[1], "--ga": t.accent, "--gi": t.ink } as CSSProperties);
const amountWords = (n: number) => (n >= 1_000_000 ? { big: fa(n / 1_000_000), unit: "میلیون تومان" } : { big: fa(n / 1000), unit: "هزار تومان" });

/** The gift card itself: theme colours and motif, the amount, the names. Tilts and catches the light under the pointer. */
export function GiftCard({ theme, amount, toName, fromName, className = "", tilt = true }: {
  theme: string; amount: number; toName?: string; fromName?: string; className?: string; tilt?: boolean;
}) {
  const t = themeById(theme);
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent) => {
    const el = ref.current;
    if (!tilt || !el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 14}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 18}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const leave = () => { ref.current?.style.removeProperty("--rx"); ref.current?.style.removeProperty("--ry"); };
  const a = amountWords(amount);
  return (
    <div className={`gc-wrap ${className}`} onPointerMove={move} onPointerLeave={leave}>
      <div ref={ref} className={`gc m-${t.motif}`} style={themeVars(t)} role="img" aria-label={`کارت هدیه ${giftAmountLabel(amount)}${toName ? ` برای ${toName}` : ""}`}>
        <i className="gc-motif" aria-hidden />
        <i className="gc-sheen" aria-hidden />
        <div className="gc-top">
          <Wordmark className="gc-wm" />
          <span className="gc-tag en">GIFT CARD</span>
        </div>
        <div className="gc-mid">
          <small>{t.title}</small>
          <b className="num">{a.big}<span>{a.unit}</span></b>
        </div>
        <div className="gc-bot">
          <span>{toName ? <>برای <b>{toName}</b></> : t.line}</span>
          {fromName ? <span>از طرف <b>{fromName}</b></span> : <Dots size={4} color="var(--ga)" />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Builder (/gift)

type When = "now" | "later" | "link";
const pad = (n: number) => String(n).padStart(2, "0");
const localInput = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function GiftBuilder() {
  const router = useRouter();
  const { ready, user, demo } = useAccount();
  const { notify } = useStore();
  const [theme, setTheme] = useState(GIFT_THEMES[0].id);
  const [amount, setAmount] = useState<number>(GIFT_AMOUNTS[1]);
  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState("");
  const [message, setMessage] = useState(GIFT_THEMES[0].note);
  const [edited, setEdited] = useState(false);
  const [when, setWhen] = useState<When>("now");
  const [mobile, setMobile] = useState("");
  const [at, setAt] = useState("");
  const [method, setMethod] = useState<PayMethod>("card");
  const [bad, setBad] = useState("");
  const [busy, setBusy] = useState(false);
  const [inFlow, setInFlow] = useState(false);
  useEffect(() => { if (ready && !user) setInFlow(true); }, [ready, user]);
  useEffect(() => { if (user?.name && !fromName) setFromName(user.name); }, [user?.name, fromName]);
  useEffect(() => { setAt((v) => v || localInput(Date.now() + 86_400_000 - (Date.now() % 3_600_000))); }, []);
  const t = themeById(theme);
  const pickTheme = (id: string) => { setTheme(id); if (!edited) setMessage(themeById(id).note); };

  const send = async () => {
    const fail = (field: string, msg: string) => { setBad(field); notify(msg); document.getElementById(`gb-${field}`)?.focus(); };
    if (!toName.trim()) return fail("to", "اسم گیرنده را بنویس");
    if (!fromName.trim()) return fail("from", "اسم خودت را بنویس تا گیرنده بداند از طرف کیست");
    if (when !== "link" && !validMobile(mobile)) return fail("mobile", "شماره موبایل گیرنده را درست وارد کن");
    const sendAt = when === "later" ? new Date(at).getTime() : null;
    if (when === "later" && !(sendAt && sendAt > Date.now() + 60_000)) return fail("at", "زمان ارسال باید بعد از الان باشد");
    if (!user || inFlow) { notify("برای پرداخت، اول با شماره خودت وارد شو"); document.getElementById("gb-login")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    setBusy(true);
    const r = await api<{ code: string; payUrl: string }>("/api/gifts", { body: {
      amount, theme, toName: toName.trim(), fromName: fromName.trim(), message: message.trim(), method,
      toMobile: when === "link" ? "" : normalizeMobile(mobile), sendAt,
    } });
    if (!r.payUrl) {
      setBusy(false);
      notify(r.error === "crypto_unavailable" ? "پرداخت با ارز دیجیتال فعلاً فعال نیست؛ از درگاه بانکی استفاده کن." : r.error === "unauthorized" ? "اول وارد حسابت شو" : "ساخت کارت هدیه انجام نشد. دوباره امتحان کن.");
      return;
    }
    if (r.payUrl.startsWith("/")) router.push(r.payUrl); else window.location.href = r.payUrl;
  };

  const signedIn = !!user && !inFlow;
  return (
    <div className="gb">
      <section className="gb-hero">
        <div className="wrap gb-hero-g">
          <div>
            <span className="gb-eyebrow"><Dots size={4} /> کارت هدیه اک‌دراپ</span>
            <h1>هدیه بده،<br /><em>انتخاب با خودش.</em></h1>
            <p>اعتبار اک‌دراپ هدیه بده؛ گیرنده هر چیزی که دوست دارد برمی‌دارد، از ChatGPT و Midjourney تا اسپاتیفای و گیفت‌کارت اپل. با طرح و پیام خودت، همین الان یا سر همان روز و ساعتی که می‌خواهی.</p>
            <ul className="gb-points">
              <li><Icon id="check" />بدون تاریخ انقضا</li>
              <li><Icon id="clock" />ارسال پیامکی زمان‌بندی‌شده</li>
              <li><Icon id="shield" />قابل خرج روی همه محصولات</li>
            </ul>
          </div>
          <div className="gb-stage">
            <GiftCard theme={theme} amount={amount} toName={toName.trim() || undefined} fromName={fromName.trim() || undefined} className="gb-card" />
            <p className="gb-msg" aria-live="polite">{message.trim() ? <>«{message.trim()}»</> : <span className="muted">پیامت اینجا روی کارت می‌آید</span>}</p>
          </div>
        </div>
      </section>

      <div className="wrap gb-form">
        <section className="gb-step">
          <header><span className="gb-n">۱</span><h2>طرح کارت</h2></header>
          <div className="gb-themes" role="radiogroup" aria-label="طرح کارت">
            {GIFT_THEMES.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={theme === x.id} className={`gb-th m-${x.motif} ${theme === x.id ? "on" : ""}`} style={themeVars(x)} onClick={() => pickTheme(x.id)}>
                <i className="gb-th-sw" aria-hidden><i className="gc-motif" /></i>
                <span>{x.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="gb-step">
          <header><span className="gb-n">۲</span><h2>مبلغ</h2></header>
          <div className="gb-amounts" role="radiogroup" aria-label="مبلغ">
            {GIFT_AMOUNTS.map((a) => {
              const w = amountWords(a);
              return (
                <button key={a} type="button" role="radio" aria-checked={amount === a} className={amount === a ? "on" : ""} onClick={() => setAmount(a)}>
                  <b className="num">{w.big}</b><small>{w.unit}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="gb-step">
          <header><span className="gb-n">۳</span><h2>برای کی؟</h2></header>
          <div className="gb-two">
            <div className="fld">
              <label htmlFor="gb-to">اسم گیرنده</label>
              <input id="gb-to" className={bad === "to" ? "bad" : ""} maxLength={GIFT_LIMITS.name} placeholder="مثلاً سارا" value={toName} onChange={(e) => { setToName(e.target.value); setBad(""); }} />
            </div>
            <div className="fld">
              <label htmlFor="gb-from">از طرف</label>
              <input id="gb-from" className={bad === "from" ? "bad" : ""} maxLength={GIFT_LIMITS.name} placeholder="اسم خودت" value={fromName} onChange={(e) => { setFromName(e.target.value); setBad(""); }} />
            </div>
          </div>
          <div className="fld gb-note">
            <label htmlFor="gb-msg">پیام تو <small className="num">{fa(message.length)}/{fa(GIFT_LIMITS.message)}</small></label>
            <textarea id="gb-msg" rows={3} maxLength={GIFT_LIMITS.message} value={message} onChange={(e) => { setMessage(e.target.value); setEdited(true); }} />
            {edited && message !== t.note && <button type="button" className="link gb-sug" onClick={() => { setMessage(t.note); setEdited(false); }}>پیام پیشنهادی «{t.title}»</button>}
          </div>
        </section>

        <section className="gb-step">
          <header><span className="gb-n">۴</span><h2>کِی و چطور برسد؟</h2></header>
          <div className="gb-when" role="radiogroup" aria-label="زمان تحویل">
            {([["now", "همین الان", "بعد از پرداخت برایش پیامک می‌شود"], ["later", "روز و ساعت دلخواه", "مثلاً نیمه‌شب تولدش"], ["link", "لینک را خودم می‌فرستم", "در تلگرام، واتس‌اپ یا هر جا"]] as const).map(([k, title, sub]) => (
              <button key={k} type="button" role="radio" aria-checked={when === k} className={when === k ? "on" : ""} onClick={() => { setWhen(k); setBad(""); }}>
                <b>{title}</b><small>{sub}</small>
              </button>
            ))}
          </div>
          {when !== "link" && (
            <div className="gb-two">
              <div className="fld">
                <label htmlFor="gb-mobile">موبایل گیرنده</label>
                <input id="gb-mobile" inputMode="tel" className={`ltr ${bad === "mobile" ? "bad" : ""}`} placeholder="09121234567" value={mobile} onChange={(e) => { setMobile(e.target.value); setBad(""); }} />
                <small>لینک هدیه با اسم تو برایش پیامک می‌شود.</small>
              </div>
              {when === "later" && (
                <div className="fld">
                  <label htmlFor="gb-at">زمان ارسال</label>
                  <input id="gb-at" type="datetime-local" className={`ltr ${bad === "at" ? "bad" : ""}`} value={at} min={localInput(Date.now())} onChange={(e) => { setAt(e.target.value); setBad(""); }} />
                  <small>{at && new Date(at).getTime() > Date.now() ? `ارسال در ${faDate(new Date(at).getTime())}` : "به وقت تهران"}</small>
                </div>
              )}
            </div>
          )}
          {when === "link" && <p className="muted gb-hint">بعد از پرداخت، لینک و کد هدیه در صفحه سفارش آماده است تا هر جا خواستی بفرستی.</p>}
        </section>

        <section className="gb-step" id="gb-login">
          <header><span className="gb-n">۵</span><h2>پرداخت</h2></header>
          {ready && !signedIn && (
            <div className="gb-login">
              <p className="muted">با شماره موبایل خودت وارد شو؛ رسید و وضعیت هدیه (رسید، باز شد، استفاده شد) را همین‌جا می‌بینی.</p>
              <LoginFlow compact onDone={() => { setInFlow(false); notify("وارد شدی"); }} />
            </div>
          )}
          <div className="opts v co-pay">
            <button className={`opt ${method === "card" ? "on" : ""}`} type="button" aria-pressed={method === "card"} onClick={() => setMethod("card")}><span className="opt-logo ic"><Icon id="lock" /></span><b>کارت بانکی</b><small>همه کارت‌های عضو شتاب</small></button>
            <button className={`opt ${method === "crypto" ? "on" : ""}`} type="button" aria-pressed={method === "crypto"} onClick={() => setMethod("crypto")}><span className="opt-logo ic usdt">₮</span><b>ارز دیجیتال</b><small>تتر، بیت‌کوین و بیشتر</small></button>
          </div>
          <div className="gb-pay">
            <div><small>قابل پرداخت</small><b className="num">{money(amount)} <small>تومان</small></b></div>
            <button className="btn btn-paper" onClick={send} disabled={busy}>{busy ? "در حال اتصال به درگاه…" : <>پرداخت و ساخت هدیه <Icon id="arrow" className="arrow" /></>}</button>
          </div>
          {demo.gateway && <small className="muted fine">درگاه آزمایشی فعال است؛ پولی کم نمی‌شود.</small>}
        </section>
      </div>

      <section className="wrap gb-how">
        <h2>هدیه چطور به دستش می‌رسد؟</h2>
        <ol>
          <li><b>پیامک یا لینک</b><span>سر وقتی که انتخاب کردی، لینک هدیه با اسم تو برایش پیامک می‌شود؛ یا خودت لینک را می‌فرستی.</span></li>
          <li><b>بازش می‌کند</b><span>کارت با طرح و پیام تو جلوی چشمش باز می‌شود.</span></li>
          <li><b>هر چی بخواهد برمی‌دارد</b><span>با شماره خودش وارد می‌شود، مبلغ به اعتبار اک‌دراپش اضافه می‌شود و موقع خرید خودکار کم می‌شود.</span></li>
        </ol>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Reveal (/gift/<code>)

function useCountdown(to: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!to) return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, [to]);
  const left = Math.max(0, (to ?? 0) - now);
  return { left, d: Math.floor(left / 86_400_000), h: Math.floor(left / 3_600_000) % 24, m: Math.floor(left / 60_000) % 60, s: Math.floor(left / 1000) % 60 };
}

function Confetti({ colors }: { colors: string[] }) {
  const bits = useMemo(() => Array.from({ length: 42 }, (_, i) => ({
    x: (i * 37) % 100, d: (i % 7) * 0.06, r: (i * 53) % 360, s: 6 + (i % 4) * 3, c: colors[i % colors.length], dx: ((i * 29) % 60) - 30,
  })), [colors]);
  return (
    <div className="gr-confetti" aria-hidden>
      {bits.map((b, i) => <i key={i} style={{ "--x": `${b.x}%`, "--d": `${b.d}s`, "--r": `${b.r}deg`, "--s": `${b.s}px`, "--c": b.c, "--dx": `${b.dx}vw` } as CSSProperties} />)}
    </div>
  );
}

export function GiftReveal({ code }: { code: string }) {
  const { ready, user, refreshOrders } = useAccount();
  const { notify } = useStore();
  const [gift, setGift] = useState<GiftView | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"card" | "login" | "done">("card");
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState(0);
  const load = () => api<{ gift: GiftView }>(`/api/gifts/${encodeURIComponent(code)}`).then((r) => setGift(r.gift ?? null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready) load(); }, [ready, user?.mobile]);
  const count = useCountdown(gift?.locked ? gift.sendAt : null);
  useEffect(() => { if (gift?.locked && count.left === 0 && gift.sendAt) load(); /* opens on time */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count.left === 0]);
  useEffect(() => { if (gift && (gift.mine === "receiver" || gift.mine === "sender")) setOpen(true); }, [gift]);

  const redeem = async () => {
    if (!user) { setStage("login"); return; }
    setBusy(true);
    const r = await api<{ amount: number; balance: number }>(`/api/gifts/${encodeURIComponent(code)}/redeem`, { method: "POST", body: {} });
    setBusy(false);
    if (r.amount) { setBalance(r.balance); setStage("done"); refreshOrders(); return; }
    if (r.error === "already_mine") { setStage("done"); api<{ balance: number }>("/api/credit").then((c) => setBalance(c.balance ?? 0)); return; }
    notify(r.error === "already_used" ? "این هدیه قبلاً با شماره دیگری دریافت شده." : r.error === "locked" ? "این هدیه هنوز باز نشده." : "دریافت هدیه انجام نشد. دوباره امتحان کن.");
    load();
  };
  // Signed in from the inline login: go straight on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (stage === "login" && user) redeem(); }, [user]);

  if (gift === undefined) return <div className="gr gr-wait"><span className="gr-spin" /></div>;
  if (gift === null) return (
    <div className="gr gr-none wrap">
      <Dots size={8} />
      <h1>هدیه‌ای با این لینک پیدا نشد</h1>
      <p className="muted">لینک را کامل باز کن یا کد هدیه را در «اعتبار من» وارد کن.</p>
      <Link className="btn btn-paper" href="/account/credit">وارد کردن کد هدیه <Icon id="arrow" className="arrow" /></Link>
    </div>
  );
  const t = themeById(gift.theme);
  const sender = gift.mine === "sender";

  if (gift.locked) return (
    <div className="gr gr-locked" style={themeVars(t)}>
      <div className="gr-glow" aria-hidden />
      <div className="gr-box gr-box-shut" aria-hidden><i className="gr-lid" /><i className="gr-ribbon" /></div>
      <h1>یک هدیه برای <b>{gift.toName}</b> در راه است</h1>
      <p>این هدیه {faDate(gift.sendAt!)} باز می‌شود.</p>
      <div className="gr-count num" aria-label="زمان باقی‌مانده">
        {count.d > 0 && <span><b>{fa(count.d)}</b><small>روز</small></span>}
        <span><b>{fa(pad(count.h))}</b><small>ساعت</small></span>
        <span><b>{fa(pad(count.m))}</b><small>دقیقه</small></span>
        <span><b>{fa(pad(count.s))}</b><small>ثانیه</small></span>
      </div>
    </div>
  );

  return (
    <div className={`gr ${open ? "is-open" : ""}`} style={themeVars(t)}>
      <div className="gr-glow" aria-hidden />
      {open && stage !== "done" && !gift.redeemed && <Confetti colors={[t.accent, t.ink, t.bg[0], "#B9FF63"]} />}
      {stage === "done" && <Confetti colors={[t.accent, "#B9FF63", t.ink]} />}
      {sender && (
        <div className="gr-sender wrap">
          <span><Icon id="user" />این صفحه‌ای است که <b>{gift.toName}</b> می‌بیند.</span>
          <GiftShare code={gift.code} toName={gift.toName} />
        </div>
      )}

      {!open ? (
        <div className="gr-closed">
          <p className="gr-for">{gift.fromName ? <><b>{gift.fromName}</b> برایت یک هدیه فرستاده</> : "یک هدیه برای تو"}</p>
          <button type="button" className="gr-box" onClick={() => setOpen(true)} aria-label="باز کردن هدیه">
            <i className="gr-lid" /><i className="gr-ribbon" /><i className="gr-bow" />
          </button>
          <button type="button" className="btn btn-paper gr-open" onClick={() => setOpen(true)}>بازش کن</button>
        </div>
      ) : (
        <div className="gr-opened wrap">
          <div className="gr-card-in"><GiftCard theme={gift.theme} amount={gift.amount} toName={gift.toName} fromName={gift.fromName} /></div>
          <div className="gr-side">
            <p className="gr-hi">{gift.toName} جان،</p>
            {gift.message && <blockquote className="gr-note">{gift.message}<cite>— {gift.fromName}</cite></blockquote>}
            {stage === "done" || gift.mine === "receiver" ? (
              <div className="gr-done">
                <span className="gr-ok"><Icon id="check" /></span>
                <div>
                  <b>{giftAmountLabel(gift.amount)} به اعتبار اک‌دراپت اضافه شد</b>
                  {balance > 0 && <small>اعتبار فعلی تو: <span className="num">{money(balance)}</span> تومان</small>}
                  <small>موقع خرید، خودکار از مبلغ کم می‌شود.</small>
                </div>
                <Link className="btn btn-paper" href="/services">انتخاب هدیه‌ام <Icon id="arrow" className="arrow" /></Link>
              </div>
            ) : gift.redeemed && !sender ? (
              <div className="gr-done used"><div><b>این هدیه قبلاً دریافت شده</b><small>اگر فکر می‌کنی اشتباهی شده، به پشتیبانی پیام بده.</small></div></div>
            ) : sender ? (
              <div className="gr-done used"><div><b>{gift.redeemed ? `${gift.toName} هدیه را دریافت کرد ${gift.redeemedAt ? faDate(gift.redeemedAt) : ""}` : `${gift.toName} هنوز هدیه را دریافت نکرده`}</b><small>کد هدیه: <span className="en">{showCode(gift.code)}</span></small></div></div>
            ) : stage === "login" && !user ? (
              <div className="gr-login">
                <b>با شماره خودت وارد شو تا {giftAmountLabel(gift.amount)} به اعتبارت اضافه شود</b>
                <LoginFlow compact onDone={() => undefined} />
              </div>
            ) : (
              <div className="gr-cta">
                <button className="btn btn-paper btn-block" onClick={redeem} disabled={busy}>{busy ? "در حال افزودن…" : <>اضافه کن به اعتبارم <span className="num">({giftAmountLabel(gift.amount)})</span></>}</button>
                <small>بعدش هر سرویسی را که بخواهی از اک‌دراپ برمی‌داری؛ اعتبار تاریخ انقضا ندارد.</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Copy / share the gift link (sender side). */
export function GiftShare({ code, toName }: { code: string; toName: string }) {
  const { notify } = useStore();
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(`${location.origin}${giftPath(code)}`), [code]);
  const text = `${toName} جان، یک هدیه برایت دارم 🎁 بازش کن:`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); notify("لینک هدیه کپی شد"); } catch { notify(url); } };
  const share = async () => { if (navigator.share) await navigator.share({ title: "هدیه اک‌دراپ", text, url }).catch(() => {}); else copy(); };
  return (
    <div className="gs">
      <button type="button" className="gs-b" onClick={copy}>کپی لینک</button>
      <a className="gs-b" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">تلگرام</a>
      <a className="gs-b" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer">واتس‌اپ</a>
      <button type="button" className="gs-b gs-more" onClick={share}>اشتراک‌گذاری</button>
    </div>
  );
}

/** Status line of a sent gift. */
export function giftStatus(g: SentGift): { label: string; tone: "ok" | "wait" | "muted" } {
  if (!g.paid) return { label: "در انتظار پرداخت", tone: "muted" };
  if (g.redeemedAt) return { label: `دریافت شد • ${faDate(g.redeemedAt)}`, tone: "ok" };
  if (g.openedAt) return { label: `باز شد • ${faDate(g.openedAt)}`, tone: "wait" };
  if (g.sendAt && g.sendAt > Date.now() && !g.sentAt) return { label: `ارسال در ${faDate(g.sendAt)}`, tone: "wait" };
  if (g.sentAt) return { label: `پیامک شد • ${faDate(g.sentAt)}`, tone: "wait" };
  return { label: g.toMobile ? "در صف ارسال" : "آماده؛ لینک را بفرست", tone: "wait" };
}

/** On a gift card's order page: the card, its link and where it stands. */
export function GiftOrderPanel({ orderCode }: { orderCode: string }) {
  const [g, setG] = useState<SentGift | null>(null);
  useEffect(() => { api<{ gifts: SentGift[] }>("/api/gifts").then((r) => setG(r.gifts?.find((x) => x.orderCode === orderCode) ?? null)); }, [orderCode]);
  if (!g) return null;
  const st = giftStatus(g);
  return (
    <section className="gop" style={themeVars(themeById(g.theme))}>
      <GiftCard theme={g.theme} amount={g.amount} toName={g.toName} tilt={false} className="gop-card" />
      <div className="gop-b">
        <span className={`gop-st ${st.tone}`}>{st.label}</span>
        <h2>{g.paid ? <>هدیه‌ات برای <b>{g.toName}</b> آماده است</> : <>کارت هدیه برای <b>{g.toName}</b></>}</h2>
        {g.paid && (
          <>
            <p className="muted">{g.toMobile ? (g.sendAt && !g.sentAt ? `سر وقتش به ${fa(g.toMobile)} پیامک می‌شود. اگر بخواهی زودتر برسد، لینک را خودت بفرست.` : `لینک هدیه به ${fa(g.toMobile)} پیامک شد. می‌توانی خودت هم بفرستی.`) : "لینک را برایش بفرست؛ با باز کردنش کارت و پیامت را می‌بیند."}</p>
            <GiftShare code={g.code} toName={g.toName} />
            <Link className="link gop-pv" href={giftPath(g.code)}>دیدن صفحه‌ای که {g.toName} می‌بیند</Link>
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Credit (/account/credit)

export function CreditPage() {
  const { notify } = useStore();
  const [data, setData] = useState<{ balance: number; history: import("@/lib/gift").CreditEntry[] } | null>(null);
  const [sent, setSent] = useState<SentGift[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => {
    api<{ balance: number; history: import("@/lib/gift").CreditEntry[] }>("/api/credit?history").then((r) => setData({ balance: r.balance ?? 0, history: r.history ?? [] }));
    api<{ gifts: SentGift[] }>("/api/gifts").then((r) => setSent(r.gifts ?? []));
  };
  useEffect(load, []);
  const redeem = async () => {
    const c = code.replace(/[^A-Za-z0-9]/g, "");
    if (c.length !== 12) { notify("کد هدیه ۱۲ حرف و عدد است، مثل K7M2-Q9XA-P3HD"); return; }
    setBusy(true);
    const r = await api<{ amount: number }>(`/api/gifts/${c}/redeem`, { method: "POST", body: {} });
    setBusy(false);
    if (r.amount) { notify(`${giftAmountLabel(r.amount)} به اعتبارت اضافه شد`); setCode(""); load(); return; }
    notify(r.error === "already_mine" ? "این هدیه را قبلاً دریافت کرده‌ای" : r.error === "already_used" ? "این کد قبلاً استفاده شده" : r.error === "locked" ? "این هدیه هنوز باز نشده" : "کد هدیه پیدا نشد");
  };
  return (
    <div className="cr">
      <header className="dash-h"><h1>اعتبار و هدیه</h1></header>
      <div className="cr-top">
        <div className="cr-bal">
          <small>اعتبار اک‌دراپ تو</small>
          <b className="num">{data ? money(data.balance) : "…"} <span>تومان</span></b>
          <p>موقع خرید، خودکار از مبلغ سفارش کم می‌شود.</p>
          <Dots size={5} />
        </div>
        <div className="cr-redeem">
          <b>کد هدیه داری؟</b>
          <div className="co-code">
            <input className="ltr en" placeholder="XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-label="کد هدیه" maxLength={16} />
            <button type="button" onClick={redeem} disabled={busy}>{busy ? "…" : "ثبت"}</button>
          </div>
          <Link className="cr-give" href="/gift"><span><b>هدیه بده</b><small>کارت هدیه با طرح و پیام خودت</small></span><Icon id="arrow" className="arrow" /></Link>
        </div>
      </div>

      {sent.length > 0 && (
        <section className="cr-sec">
          <h2>هدیه‌هایی که فرستادی</h2>
          <ul className="cr-sent">
            {sent.map((g) => {
              const st = giftStatus(g);
              return (
                <li key={g.code} style={themeVars(themeById(g.theme))}>
                  <i className={`cr-sw m-${themeById(g.theme).motif}`} aria-hidden><i className="gc-motif" /></i>
                  <div><b>برای {g.toName}</b><small className="num">{giftAmountLabel(g.amount)}</small></div>
                  <span className={`gop-st ${st.tone}`}>{st.label}</span>
                  <Link className="link" href={`/orders/${g.orderCode}`}>جزئیات</Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="cr-sec">
        <h2>گردش اعتبار</h2>
        {!data ? null : data.history.length ? (
          <ul className="cr-hist">
            {data.history.map((h, i) => (
              <li key={i}>
                <span className={h.amount > 0 ? "in" : "out"}>{h.amount > 0 ? "+" : "−"}<span className="num">{money(Math.abs(h.amount))}</span></span>
                <span>{h.reason === "gift" ? "دریافت کارت هدیه" : h.reason === "order" ? <>خرید <Link className="link en" href={`/orders/${h.ref}`}>{h.ref}</Link></> : "اصلاح توسط پشتیبانی"}</span>
                <small className="muted">{faDate(h.at)}</small>
              </li>
            ))}
          </ul>
        ) : <p className="muted">هنوز اعتباری نداری. وقتی کسی برایت هدیه بفرستد، اینجا می‌بینی‌اش.</p>}
      </section>
    </div>
  );
}

/** Checkout: the customer's credit and whether to use it. */
export function useCreditBalance(signedIn: boolean) {
  const [balance, setBalance] = useState(0);
  useEffect(() => { if (signedIn) api<{ balance: number }>("/api/credit").then((r) => setBalance(r.balance ?? 0)); else setBalance(0); }, [signedIn]);
  return balance;
}

/** Home page: the gift card in one striking strip. */
export function GiftPromo() {
  return (
    <section className="gp">
      <div className="wrap gp-g">
        <div className="gp-copy">
          <span className="gb-eyebrow"><Dots size={4} /> کارت هدیه اک‌دراپ</span>
          <h2>هدیه بده،<br /><em>انتخاب با خودش.</em></h2>
          <p>اعتبار اک‌دراپ با طرح و پیام خودت؛ همین الان یا نیمه‌شب تولدش پیامک می‌شود و هر سرویسی را که بخواهد برمی‌دارد.</p>
          <Link className="btn btn-paper" href="/gift">ساختن کارت هدیه <Icon id="arrow" className="arrow" /></Link>
        </div>
        <Link href="/gift" className="gp-fan" aria-label="ساختن کارت هدیه">
          <GiftCard theme="birthday" amount={500_000} tilt={false} className="gp-c gp-c1" />
          <GiftCard theme="drop" amount={2_000_000} tilt={false} className="gp-c gp-c2" />
          <GiftCard theme="yalda" amount={1_000_000} toName="تو" tilt={false} className="gp-c gp-c3" />
        </Link>
      </div>
    </section>
  );
}
