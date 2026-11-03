"use client";

import { useState } from "react";
import { validEmail } from "@/lib/account";
import { fa, faDate } from "@/lib/format";
import { useAccount } from "@/components/account";
import { useStore } from "@/components/store";
import { api } from "@/components/account";
import { EMPTY_LEGAL, LegalForm, useLegal } from "@/components/legal";
import type { LegalInfo } from "@/lib/billing";
import { useEffect } from "react";

/** Saved buyer details for official invoices («فاکتور رسمی»). */
function LegalSection() {
  const { notify } = useStore();
  const saved = useLegal();
  const [v, setV] = useState<LegalInfo>(EMPTY_LEGAL);
  const [bad, setBad] = useState<keyof LegalInfo | "">("");
  useEffect(() => { if (saved) setV(saved); }, [saved]);
  if (saved === undefined) return null;
  return (
    <form className="dash-sec prof" noValidate onSubmit={async (e) => {
      e.preventDefault();
      const r = await api<{ legal: LegalInfo }>("/api/account/legal", { body: v });
      if (r.legal) { setV(r.legal); notify("ذخیره شد"); } else setBad((r.field as keyof LegalInfo) ?? "name");
    }}>
      <h2>اطلاعات فاکتور رسمی</h2>
      <p className="muted">اگر برای شرکت خرید می‌کنی، یک بار اینجا وارد کن تا در تسویه حساب خودکار پر شود. از صفحه هر سفارش هم می‌توانی فاکتور بگیری.</p>
      <LegalForm value={v} onChange={(x) => { setV(x); setBad(""); }} bad={bad} />
      <button className="btn btn-paper">ذخیره اطلاعات فاکتور</button>
    </form>
  );
}

export default function ProfilePage() {
  const { user, updateProfile } = useAccount();
  const { notify } = useStore();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bad, setBad] = useState(false);
  if (!user) return null;
  return (
    <>
      <header className="dash-h"><h1>حساب کاربری</h1><p className="muted">عضو از {faDate(user.createdAt, false)}</p></header>
      <form className="dash-sec prof" noValidate onSubmit={async (e) => {
        e.preventDefault();
        if (email && !validEmail(email)) { setBad(true); return; }
        notify((await updateProfile({ name: name.trim(), email: email.trim() })) ? "ذخیره شد" : "ذخیره نشد. دوباره امتحان کن.");
      }}>
        <div className="fld"><label htmlFor="pf-n">نام و نام خانوادگی</label><input id="pf-n" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
        <div className="fld"><label htmlFor="pf-m">شماره موبایل</label><input id="pf-m" className="ltr" value={fa(user.mobile)} disabled /><small className="muted">برای تغییر شماره به پشتیبانی پیام بده.</small></div>
        <div className="fld"><label htmlFor="pf-e">ایمیل پیش‌فرض اکانت‌ها</label><input id="pf-e" className={`ltr ${bad ? "bad" : ""}`} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setBad(false); }} placeholder="you@gmail.com" /><small className="muted">در تسویه حساب خودکار پر می‌شود.</small></div>
        <button className="btn btn-paper">ذخیره</button>
      </form>
      <LegalSection />
    </>
  );
}
