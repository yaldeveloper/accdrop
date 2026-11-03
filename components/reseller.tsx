"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRODUCTS, minPrice, optionLabel, planKeys, priceOf, type DeliveryType } from "@/lib/catalog";
import { RESELLER_KINDS, RESELLER_TIERS, RESELLER_VOLUMES } from "@/lib/account";
import { faDate, money } from "@/lib/format";
import { BrandLogo, Icon } from "./brand";
import { LoginFlow } from "./login";
import { useAccount } from "./account";
import { useStore } from "./store";

/** Application form on /reseller. Signs the visitor in first, then asks four short questions. */
export function ResellerForm() {
  const { ready, user, reseller, applyReseller } = useAccount();
  const [business, setBusiness] = useState("");
  const [kind, setKind] = useState(RESELLER_KINDS[0]);
  const [link, setLink] = useState("");
  const [volume, setVolume] = useState(RESELLER_VOLUMES[0]);
  const [note, setNote] = useState("");
  const [bad, setBad] = useState(false);
  const [inFlow, setInFlow] = useState(false);
  // Keep the login form mounted until it finishes (new users still get the name step).
  useEffect(() => { if (ready && !user) setInFlow(true); }, [ready, user]);

  if (!ready) return <div className="rs-form" />;
  if (!user || inFlow) {
    return (
      <div className="rs-form">
        <h3>۱. وارد حسابت شو</h3>
        <p className="muted">درخواست نمایندگی به حساب کاربری‌ات وصل می‌شود تا وضعیتش را همان‌جا ببینی.</p>
        <LoginFlow compact onDone={() => setInFlow(false)} />
      </div>
    );
  }
  if (reseller) {
    return (
      <div className="rs-form rs-done">
        <span className="chip s1"><i />{{ approved: "تأیید شده", pending: "در حال بررسی", rejected: "تأیید نشد" }[reseller.status]}</span>
        <h3>درخواستت ثبت شد</h3>
        <p className="muted">ثبت در {faDate(reseller.createdAt)}. معمولاً ظرف یک روز کاری بررسی می‌کنیم و نتیجه را پیامک می‌کنیم.</p>
        <Link className="btn btn-paper" href="/account/reseller">رفتن به پنل نمایندگی <Icon id="arrow" className="arrow" /></Link>
      </div>
    );
  }
  return (
    <form className="rs-form" noValidate onSubmit={(e) => {
      e.preventDefault();
      if (!business.trim()) { setBad(true); return; }
      applyReseller({ business: business.trim(), kind, link: link.trim(), volume, note: note.trim() });
    }}>
      <h3>درخواست نمایندگی</h3>
      <p className="muted">وارد شده با <span className="num">{user.mobile}</span></p>
      <div className="fld"><label htmlFor="rs-b">نام کسب‌وکار، کانال یا پیج</label><input id="rs-b" className={bad ? "bad" : ""} value={business} onChange={(e) => { setBusiness(e.target.value); setBad(false); }} placeholder="مثلاً فروشگاه دیجیتال آریا" /></div>
      <div className="fld"><label htmlFor="rs-k">کجا می‌فروشی؟</label>
        <select id="rs-k" value={kind} onChange={(e) => setKind(e.target.value)}>{RESELLER_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
      <div className="fld"><label htmlFor="rs-l">لینک کانال، پیج یا سایت (اختیاری)</label><input id="rs-l" className="ltr" value={link} onChange={(e) => setLink(e.target.value)} placeholder="t.me/yourchannel" /></div>
      <div className="fld"><label>حجم فروش فعلی یا پیش‌بینی</label>
        <div className="rs-vol">{RESELLER_VOLUMES.map((v) => <button type="button" key={v} className={v === volume ? "on" : ""} onClick={() => setVolume(v)}>{v}</button>)}</div></div>
      <div className="fld"><label htmlFor="rs-n">توضیح کوتاه (اختیاری)</label><textarea id="rs-n" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً بیشتر ChatGPT و Canva می‌فروشم" /></div>
      <button className="btn btn-paper btn-block">ثبت درخواست <Icon id="arrow" className="arrow" /></button>
      <small className="muted fine">ثبت درخواست رایگان است و تعهدی ایجاد نمی‌کند.</small>
    </form>
  );
}

/** Dashboard tab: application status, then (once approved) partner prices and a referral link. */
export function ResellerPanel() {
  const { user, reseller } = useAccount();
  const { notify } = useStore();
  if (!user) return null;
  if (!reseller) {
    return (
      <div className="dash-empty">
        <b>هنوز نماینده نیستی</b>
        <p className="muted">با قیمت همکاری بفروش و سود ببر. ثبت درخواست دو دقیقه طول می‌کشد.</p>
        <Link className="btn btn-paper" href="/reseller">درباره نمایندگی <Icon id="arrow" className="arrow" /></Link>
      </div>
    );
  }
  if (reseller.status === "rejected") {
    return (
      <div className="rs-pending">
        <span className="chip sx"><i />تأیید نشد</span>
        <h2>{reseller.business}</h2>
        <p className="muted">فعلاً درخواستت تأیید نشد. برای توضیح بیشتر یا بررسی دوباره به پشتیبانی پیام بده.</p>
      </div>
    );
  }
  if (reseller.status === "pending") {
    return (
      <div className="rs-pending">
        <span className="chip s1"><i />در حال بررسی</span>
        <h2>{reseller.business}</h2>
        <p className="muted">درخواستت در {faDate(reseller.createdAt)} ثبت شد. معمولاً ظرف یک روز کاری بررسی می‌کنیم و نتیجه را پیامک می‌کنیم.</p>
        <dl className="rs-dl"><div><dt>کانال فروش</dt><dd>{reseller.kind}</dd></div><div><dt>حجم فروش</dt><dd>{reseller.volume}</dd></div>{reseller.link && <div><dt>لینک</dt><dd className="en">{reseller.link}</dd></div>}</dl>
      </div>
    );
  }
  const tier = RESELLER_TIERS[0];
  const ref = `https://accdrop.ir/?ref=${user.mobile.slice(-6)}`;
  return (
    <>
      <div className="rs-stats">
        <div><small>سطح</small><b>{tier.title}</b><span className="muted">{Math.round(tier.rate * 100)}٪ زیر قیمت سایت</span></div>
        <div><small>فروش این ماه</small><b className="num">۰ <i>تومان</i></b><span className="muted">تا سطح نقره‌ای: ۲۰ میلیون</span></div>
        <div><small>لینک معرفی تو</small><b className="en rs-ref">{ref.replace("https://", "")}</b>
          <button className="link" onClick={() => { navigator.clipboard?.writeText(ref).catch(() => {}); notify("لینک کپی شد"); }}>کپی لینک</button></div>
      </div>
      <div className="dash-sec">
        <h2>قیمت همکاری تو</h2>
        <div className="rs-table" role="table">
          <div className="rs-tr rs-th" role="row"><span>ابزار</span><span>قیمت سایت</span><span>قیمت تو</span><span>سود تو</span></div>
          {PRODUCTS.map((p) => {
            const m = planKeys(p)[0];
            const site = minPrice(p);
            const t = (Object.keys(p.plans[m] ?? {})[0] ?? "own") as DeliveryType;
            const base = priceOf({ id: p.id, plan: m, type: t }).price;
            const yours = Math.round((Math.min(site, base) * (1 - tier.rate)) / 1000) * 1000;
            return (
              <div className="rs-tr" role="row" key={p.id}>
                <span className="rs-p"><span className="mono"><BrandLogo id={p.id} size={18} /></span><b className="en">{p.name}</b><small className="muted">{optionLabel(p, m)}</small></span>
                <span className="num muted">{money(site)}</span><span className="num">{money(yours)}</span><span className="num ok">{money(site - yours)}</span>
              </div>
            );
          })}
        </div>
        <small className="muted fine" style={{ textAlign: "right" }}>درصدها نمونه‌اند و قبل از راه‌اندازی نهایی می‌شوند.</small>
      </div>
    </>
  );
}
