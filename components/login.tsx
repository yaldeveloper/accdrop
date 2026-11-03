"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_OTP, normalizeMobile, validMobile } from "@/lib/account";
import { fa } from "@/lib/format";
import { Icon } from "./brand";
import { useAccount } from "./account";

/** Mobile + one-time code login. New users are asked for a name in a third, skippable step. */
export function LoginFlow({ onDone, compact = false }: { onDone: () => void; compact?: boolean }) {
  const { requestOtp, verifyOtp, updateProfile, demo } = useAccount();
  const [step, setStep] = useState<"mobile" | "code" | "name">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    if (!validMobile(mobile)) { setErr("شماره موبایل را درست وارد کن، مثل ۰۹۱۲۱۲۳۴۵۶۷"); return; }
    setErr(""); setBusy(true);
    const r = await requestOtp(normalizeMobile(mobile));
    setBusy(false);
    if (!r.ok) {
      if (r.error === "too_soon") { setStep("code"); setWait(r.wait ?? 60); setErr(""); return; }
      setErr(r.error === "too_many" ? "تعداد درخواست‌ها زیاد بود. یک ساعت دیگر امتحان کن." : "ارسال پیامک انجام نشد. چند لحظه دیگر دوباره امتحان کن.");
      return;
    }
    setStep("code"); setWait(60); setCode("");
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const verify = async (c = code) => {
    if (c.length < 5) return;
    setBusy(true);
    const r = await verifyOtp(mobile, c);
    setBusy(false);
    if (!r.ok) {
      setErr({ expired: "کد منقضی شده. یک کد تازه بگیر.", too_many: "چند بار اشتباه زدی. یک کد تازه بگیر.", blocked: "این حساب مسدود شده. با پشتیبانی تماس بگیر." }[r.error ?? ""] ?? "کد درست نیست. دوباره امتحان کن.");
      setCode(""); return;
    }
    setErr("");
    if (r.isNew) setStep("name"); else onDone();
  };

  const toEn = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "");

  return (
    <div className={`login ${compact ? "compact" : ""}`}>
      {step === "mobile" && (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} noValidate>
          {!compact && <h1>ورود یا ثبت‌نام</h1>}
          <p className="muted">شماره موبایلت را وارد کن. یک کد برایت پیامک می‌کنیم.</p>
          <div className="fld">
            <label htmlFor="lg-m">شماره موبایل</label>
            <input id="lg-m" className={`ltr ${err ? "bad" : ""}`} type="tel" inputMode="numeric" autoComplete="tel" placeholder="09xx xxx xxxx"
              value={mobile} onChange={(e) => { setMobile(e.target.value); setErr(""); }} autoFocus={!compact} />
            {err && <small className="err">{err}</small>}
          </div>
          <button className="btn btn-paper btn-block" disabled={busy}>{busy ? "در حال ارسال…" : "دریافت کد"} {!busy && <Icon id="arrow" className="arrow" />}</button>
          <small className="muted fine">با ورود، <a className="link" href="#">قوانین اک‌دراپ</a> را می‌پذیری.</small>
        </form>
      )}
      {step === "code" && (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} noValidate>
          {!compact && <h1>کد تأیید</h1>}
          <p className="muted">کد ۵ رقمی به <b className="num">{fa(normalizeMobile(mobile))}</b> پیامک شد. <button type="button" className="link" onClick={() => setStep("mobile")}>تغییر شماره</button></p>
          <div className="fld">
            <label htmlFor="lg-c">کد تأیید</label>
            <input id="lg-c" ref={codeRef} className={`ltr otp ${err ? "bad" : ""}`} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={5} placeholder="– – – – –"
              value={code} onChange={(e) => { const v = toEn(e.target.value).slice(0, 5); setCode(v); setErr(""); if (v.length === 5) verify(v); }} />
            {err ? <small className="err">{err}</small> : demo.login ? <small className="muted">نسخه آزمایشی: کد <b className="num">{fa(DEMO_OTP)}</b> است.</small> : null}
          </div>
          <button className="btn btn-paper btn-block" disabled={busy || code.length < 5}>{busy ? "در حال بررسی…" : "ورود"}</button>
          <small className="muted fine">{wait > 0 ? <>ارسال دوباره تا <span className="num">{fa(wait)}</span> ثانیه دیگر</> : <button type="button" className="link" onClick={send}>ارسال دوباره کد</button>}</small>
        </form>
      )}
      {step === "name" && (
        <form onSubmit={async (e) => { e.preventDefault(); if (name.trim()) { setBusy(true); await updateProfile({ name: name.trim() }); setBusy(false); } onDone(); }} noValidate>
          {!compact && <h1>خوش آمدی</h1>}
          <p className="muted">اسمت را بگو تا سفارش‌ها و پاس‌هایت به نامت باشد.</p>
          <div className="fld">
            <label htmlFor="lg-n">نام و نام خانوادگی</label>
            <input id="lg-n" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <button className="btn btn-paper btn-block">ادامه <Icon id="arrow" className="arrow" /></button>
          <button type="button" className="link fine" onClick={onDone}>بعداً</button>
        </form>
      )}
    </div>
  );
}
