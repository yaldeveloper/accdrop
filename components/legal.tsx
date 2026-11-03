"use client";

import { useEffect, useState } from "react";
import { EMPTY_LEGAL, LEGAL_ERRORS, type LegalInfo } from "@/lib/billing";
import { api } from "./account";

/** Loads the signed-in user's saved legal details once. */
export function useLegal(enabled = true) {
  const [legal, setLegal] = useState<LegalInfo | null | undefined>(undefined);
  useEffect(() => { if (enabled) api<{ legal: LegalInfo | null }>("/api/account/legal").then((r) => setLegal(r.legal ?? null)); }, [enabled]);
  return legal;
}

/** Buyer details for an official invoice (company or person). Controlled: value + onChange. */
export function LegalForm({ value, onChange, bad, disabled }: { value: LegalInfo; onChange: (v: LegalInfo) => void; bad?: keyof LegalInfo | ""; disabled?: boolean }) {
  const set = (patch: Partial<LegalInfo>) => onChange({ ...value, ...patch });
  const co = value.kind === "company";
  const f = (k: keyof LegalInfo, label: string, o: { ltr?: boolean; ph?: string; opt?: boolean; mode?: "numeric" | "tel"; wide?: boolean } = {}) => (
    <div className={`fld ${o.wide ? "lg-w" : ""}`}>
      <label htmlFor={`leg-${k}`}>{label}{o.opt && <small className="muted"> (اختیاری)</small>}</label>
      <input id={`leg-${k}`} className={`${o.ltr ? "ltr" : ""} ${bad === k ? "bad" : ""}`} inputMode={o.mode} placeholder={o.ph} disabled={disabled}
        value={value[k]} onChange={(e) => set({ [k]: e.target.value })} aria-invalid={bad === k} />
      {bad === k && <small className="err">{LEGAL_ERRORS[k]}</small>}
    </div>
  );
  return (
    <div className="lg">
      <div className="lg-kind" role="radiogroup" aria-label="نوع خریدار">
        <button type="button" role="radio" aria-checked={co} className={co ? "on" : ""} onClick={() => set({ kind: "company" })} disabled={disabled}>شرکت / حقوقی</button>
        <button type="button" role="radio" aria-checked={!co} className={!co ? "on" : ""} onClick={() => set({ kind: "person" })} disabled={disabled}>شخص حقیقی</button>
      </div>
      <div className="lg-g">
        {f("name", co ? "نام شرکت" : "نام و نام خانوادگی", { wide: true, ph: co ? "شرکت نمونه (سهامی خاص)" : "" })}
        {f("nationalId", co ? "شناسه ملی" : "کد ملی", { ltr: true, mode: "numeric", ph: co ? "۱۱ رقم" : "۱۰ رقم" })}
        {f("economicCode", "کد اقتصادی", { ltr: true, mode: "numeric", opt: true })}
        {co && f("regNo", "شماره ثبت", { ltr: true, mode: "numeric", opt: true })}
        {f("postal", "کد پستی", { ltr: true, mode: "numeric", ph: "۱۰ رقم" })}
        {f("phone", "تلفن ثابت", { ltr: true, mode: "tel", opt: true, ph: "021…" })}
        {f("address", "نشانی", { wide: true })}
      </div>
    </div>
  );
}

export { EMPTY_LEGAL };
