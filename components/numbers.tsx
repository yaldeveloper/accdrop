"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { optionLabel, planKeys, type Product } from "@/lib/catalog";
import { SERVICE_LOGOS } from "@/lib/number-logos";
import { NUMBER_SERVICES, livePlanKey, type NumberState } from "@/lib/numbers";
import { fa, money } from "@/lib/format";
import { api } from "./account";
import { useStore } from "./store";

type Offer = { country: string; name: string; iso: string; price: number; count: number };

/** Fixed-price countries from the catalog, used while 5sim is not connected (no FIVESIM_API_KEY). */
const staticOffers = (p: Product): Offer[] => planKeys(p).filter((k) => p.plans[k]?.number).map((k) => ({
  country: k, name: optionLabel(p, k), iso: k === "uk" ? "gb" : /^[a-z]{2}$/.test(k) ? k : "", price: p.plans[k]!.number!, count: 0,
})).sort((a, b) => a.price - b.price);

/** Live 5sim numbers: pick a service, then buy from a plain list of countries (price, stock, one button). */
export function NumberShop({ product: p }: { product: Product }) {
  const { addLine } = useStore();
  const router = useRouter();
  const [service, setService] = useState("telegram");
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"price" | "stock">("price");
  /** false = 5sim is not connected: sell the catalog's fixed countries instead. */
  const [live, setLive] = useState(true);

  useEffect(() => {
    let stop = false;
    setOffers(null); setFailed(false);
    api<{ offers: Offer[]; live?: boolean }>(`/api/numbers?service=${service}`).then((r) => {
      if (stop) return;
      if (r.live === false) { setLive(false); setOffers(staticOffers(p)); return; }
      setOffers(r.offers ?? []);
      setFailed(!!r.error || !r.offers);
    });
    return () => { stop = true; };
  }, [service, p]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const l = (offers ?? []).filter((o) => !s || o.name.toLowerCase().includes(s) || o.country.includes(s));
    return sort === "stock" ? [...l].sort((a, b) => b.count - a.count) : l;
  }, [offers, q, sort]);
  const svc = NUMBER_SERVICES.find((s) => s.id === service)!;

  const buy = (o: Offer) => {
    addLine(live ? { id: p.id, plan: livePlanKey(o.country, service), type: "number", unit: o.price } : { id: p.id, plan: o.country, type: "number" });
    router.push("/checkout");
  };

  return (
    <div className="vn" id="buy">
      {live && <div className="vn-step">
        <h2><span className="num">۱</span> سرویس</h2>
        <div className="vn-svc" role="radiogroup" aria-label="سرویس">
          {NUMBER_SERVICES.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === service} className={s.id === service ? "on" : ""} onClick={() => { setService(s.id); setQ(""); }}>
              <ServiceLogo id={s.id} />{s.fa}
            </button>
          ))}
        </div>
      </div>}

      <div className="vn-step">
        <div className="vn-bar">
          {live ? <h2><span className="num">۲</span> کشور شماره <ServiceLogo id={service} small /> {svc.fa}</h2> : <h2>کشور شماره</h2>}
          <div className="vn-tools">
            <input className="vn-q" placeholder="جست‌وجوی کشور" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جست‌وجوی کشور" />
            <select className="vn-sort" value={sort} onChange={(e) => setSort(e.target.value as "price")} aria-label="مرتب‌سازی">
              <option value="price">ارزان‌ترین</option>
              <option value="stock">بیشترین موجودی</option>
            </select>
          </div>
        </div>
        {offers === null ? <p className="vn-wait">در حال گرفتن قیمت‌های لحظه‌ای…</p>
          : !offers.length ? <p className="vn-wait">{failed ? "الان به سرور شماره‌ها وصل نشدیم. چند لحظه دیگر دوباره امتحان کن." : `فعلاً شماره‌ای برای ${svc.fa} موجود نیست.`}</p>
          : !list.length ? <p className="vn-wait">کشوری با این نام پیدا نشد.</p>
          : (
            <ul className="vn-rows">
              {list.map((o) => (
                <li key={o.country}>
                  <span className="vn-c">
                    {o.iso ? <img src={`/flags/${o.iso}.svg`} alt="" width={28} height={21} loading="lazy" /> : <span className="vn-flag" />}
                    <b>{o.name}</b>
                  </span>
                  <small className="vn-n num">{!live ? "موجود" : o.count > 999 ? "بیش از ۱۰۰۰ عدد" : `${fa(o.count)} عدد`}</small>
                  <b className="vn-p num">{money(o.price)} <small>تومان</small></b>
                  <button className="btn btn-paper vn-buy" onClick={() => buy(o)}>خرید</button>
                </li>
              ))}
            </ul>
          )}
      </div>

      <ol className="vn-how">
        <li><b>پرداخت</b><span>قیمت لحظه‌ای است و همان را می‌پردازی.</span></li>
        <li><b>شماره</b><span>فوراً در صفحه سفارش نمایش داده می‌شود.</span></li>
        <li><b>کد</b><span>کد تأیید همان‌جا می‌آید. کد نیامد؟ شماره جدید یا بازگشت وجه.</span></li>
      </ol>
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

/** A service's mark on its brand colour. */
export function ServiceLogo({ id, small }: { id: string; small?: boolean }) {
  const l = SERVICE_LOGOS[id];
  if (!l) return null;
  const light = /^#(FFF|E7E|A2A)/i.test(l.c);
  return (
    <span className={`vn-logo ${small ? "sm" : ""}`} style={{ background: l.c }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill={light ? "#111418" : "#fff"}><path d={l.d} /></svg>
    </span>
  );
}
