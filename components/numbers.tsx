"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/catalog";
import { NUMBER_SERVICES, livePlanKey, type NumberState } from "@/lib/numbers";
import { fa, money } from "@/lib/format";
import { api } from "./account";
import { Icon } from "./brand";
import { useStore } from "./store";

type Offer = { country: string; name: string; price: number; count: number };

/** Product-page picker for live 5sim numbers: service → country (live price and stock) → checkout. */
export function NumberPanel({ product: p }: { product: Product }) {
  const { addLine, notify } = useStore();
  const router = useRouter();
  const [service, setService] = useState("telegram");
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let stop = false;
    setOffers(null); setFailed(false); setCountry(null);
    api<{ offers: Offer[] }>(`/api/numbers?service=${service}`).then((r) => {
      if (stop) return;
      setOffers(r.offers ?? []);
      setFailed(!!r.error || !r.offers);
      if (r.offers?.length) setCountry(r.offers[0].country);
    });
    return () => { stop = true; };
  }, [service]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const l = (offers ?? []).filter((o) => !s || o.name.toLowerCase().includes(s) || o.country.includes(s));
    return s || all ? l : l.slice(0, 8);
  }, [offers, q, all]);
  const chosen = offers?.find((o) => o.country === country) ?? null;
  const sel = chosen ? { id: p.id, plan: livePlanKey(chosen.country, service), type: "number" as const, unit: chosen.price } : null;
  const svc = NUMBER_SERVICES.find((s) => s.id === service)!;

  const buy = () => { if (!sel) return; addLine(sel); router.push("/checkout"); };
  const add = () => sel && notify(addLine(sel) ? `شماره ${svc.fa} ${chosen!.name} به سبد اضافه شد` : "این شماره از قبل در سبد هست");

  return (
    <div className="bx" id="buy">
      <h2 className="bx-t">انتخاب شماره</h2>
      <fieldset className="bx-g">
        <legend>برای کدام سرویس؟</legend>
        <div className="vn-svc" role="radiogroup" aria-label="سرویس">
          {NUMBER_SERVICES.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === service} className={s.id === service ? "on" : ""} onClick={() => setService(s.id)}>{s.fa}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="bx-g">
        <legend>کشور شماره</legend>
        <input className="vn-q" placeholder="جست‌وجوی کشور" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جست‌وجوی کشور" />
        {offers === null ? <p className="vn-wait">در حال گرفتن قیمت‌های لحظه‌ای…</p>
          : !offers.length ? <p className="vn-wait">{failed ? "الان به سرور شماره‌ها وصل نشدیم. چند لحظه دیگر دوباره امتحان کن." : `فعلاً شماره‌ای برای ${svc.fa} موجود نیست.`}</p>
          : (
            <div className="vn-list" role="radiogroup" aria-label="کشور">
              {list.map((o) => (
                <label key={o.country} className={`bx-o vn-o ${o.country === country ? "on" : ""}`}>
                  <input type="radio" name="vn-country" checked={o.country === country} onChange={() => setCountry(o.country)} />
                  <span className="bx-r" aria-hidden="true" />
                  <span className="bx-l"><b>{o.name}</b><small className="num">{o.count > 999 ? "موجود" : `${fa(o.count)} شماره آزاد`}</small></span>
                  <span className="bx-p num">{money(o.price)}</span>
                </label>
              ))}
              {!q && !all && offers.length > list.length && <button type="button" className="add-link" onClick={() => setAll(true)}>همه {fa(offers.length)} کشور</button>}
              {!list.length && <p className="vn-wait">کشوری با این نام پیدا نشد.</p>}
            </div>
          )}
      </fieldset>
      <div className="bx-sum">
        <div className="bx-row"><span>مبلغ قابل پرداخت</span><span><b className="num">{chosen ? money(chosen.price) : "—"}</b> <small>تومان</small></span></div>
      </div>
      <p className="bx-note">قیمت لحظه‌ای است. بعد از پرداخت، شماره فوراً در صفحه سفارش نمایش داده می‌شود و کد تأیید {svc.fa} همان‌جا می‌آید. اگر کد نیامد، شماره جدید می‌گیری یا مبلغ برمی‌گردد.</p>
      <button className="btn btn-paper btn-block bx-cta" onClick={buy} disabled={!sel}>ادامه خرید <Icon id="arrow" className="arrow" /></button>
      <button className="add-link" onClick={add} disabled={!sel}>افزودن به سبد خرید</button>
      <ul className="bx-trust">
        <li><Icon id="shield" /><span>کد نیامد؟<br />بازگشت وجه</span></li>
        <li><Icon id="user" /><span>تحویل فوری<br />و خودکار</span></li>
        <li><Icon id="chat" /><span>پشتیبانی<br />تا ۱۲ شب</span></li>
      </ul>
    </div>
  );
}

const STATUS: Record<NumberState["status"], string> = {
  BUYING: "در حال گرفتن شماره…", PENDING: "منتظر کد تأیید", RECEIVED: "کد رسید", FINISHED: "تمام شد",
  CANCELED: "لغو شد", TIMEOUT: "زمان تمام شد", BANNED: "شماره مسدود شد", FAILED: "شماره گرفته نشد",
};

const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${fa(Math.floor(s / 60))}:${fa(String(s % 60).padStart(2, "0"))}`; };

/** A paid live number on the order page: the number, a countdown, codes as they arrive, cancel / new number. */
export function NumberBox({ code, lineId, initial, onDone }: { code: string; lineId: number; initial?: NumberState; onDone?: () => void }) {
  const { notify } = useStore();
  const [n, setN] = useState<NumberState | undefined>(initial);
  const [busy, setBusy] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const url = `/api/orders/${encodeURIComponent(code)}/number`;

  const apply = useCallback((r: { number?: NumberState; error?: string }) => {
    if (r.number) setN((prev) => {
      if (!prev?.codes.length && r.number!.codes.length) onDone?.();
      return r.number;
    });
    return r;
  }, [onDone]);

  const waiting = !n || n.status === "BUYING" || n.status === "PENDING";
  useEffect(() => {
    if (!waiting) return;
    let stop = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      apply(await api<{ number?: NumberState }>(`${url}?line=${lineId}`));
      if (!stop) t = setTimeout(tick, 5000);
    };
    tick();
    return () => { stop = true; clearTimeout(t); };
  }, [waiting, url, lineId, apply]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const act = async (action: "cancel" | "retry" | "done") => {
    setBusy(action);
    const r = apply(await api<{ number?: NumberState }>(url, { body: { line: lineId, action } }));
    setBusy("");
    if (r.error) notify("انجام نشد. چند لحظه دیگر دوباره امتحان کن.");
  };
  const copy = (s: string) => { navigator.clipboard?.writeText(s).then(() => notify("کپی شد"), () => {}); };

  if (!n) return <small className="muted">در حال گرفتن شماره…</small>;
  const left = n.expiresAt ? n.expiresAt - now : 0;
  return (
    <div className={`vn-box vn-${n.status.toLowerCase()}`}>
      <div className="vn-top">
        <span className="vn-st"><i />{STATUS[n.status]}</span>
        {n.status === "PENDING" && left > 0 && <span className="num muted" aria-label="زمان باقی‌مانده">{mmss(left)}</span>}
      </div>
      {n.phone && (
        <button type="button" className="vn-phone en" onClick={() => copy(n.phone!)} title="کپی شماره">{n.phone}<small>کپی</small></button>
      )}
      {n.codes.length ? (
        <ul className="vn-codes">
          {n.codes.map((c, i) => (
            <li key={i}><button type="button" className="vn-code en" onClick={() => copy(c.code || c.text)}>{c.code || "—"}</button><small className="en">{c.text}</small></li>
          ))}
        </ul>
      ) : n.status === "PENDING" ? <small className="muted">شماره را در اپ وارد کن و درخواست کد بده؛ کد چند ثانیه بعد همین‌جا ظاهر می‌شود. این صفحه را باز نگه دار.</small> : null}
      <div className="vn-act">
        {n.status === "PENDING" && !n.codes.length && <button className="btn btn-ghost" onClick={() => act("cancel")} disabled={!!busy}>{busy === "cancel" ? "…" : "کد نمی‌آید؛ لغو این شماره"}</button>}
        {n.canRetry && <button className="btn btn-paper" onClick={() => act("retry")} disabled={!!busy}>{busy === "retry" ? "در حال گرفتن…" : "یک شماره دیگر بده"}</button>}
        {(n.status === "RECEIVED") && <button className="btn btn-ghost" onClick={() => act("done")} disabled={!!busy}>{busy === "done" ? "…" : "کارم تمام شد"}</button>}
      </div>
      {!n.codes.length && !n.canRetry && ["CANCELED", "TIMEOUT", "BANNED", "FAILED"].includes(n.status) && (
        <small className="muted">کدی نیامد و سقف {fa(n.tries)} شماره هم پر شد. مبلغ این شماره را برمی‌گردانیم؛ اگر عجله داری تیکت بزن.</small>
      )}
    </div>
  );
}
