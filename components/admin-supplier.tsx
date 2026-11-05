"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fa, money } from "@/lib/format";
import { ALL_PRODUCTS, optionLabel } from "@/lib/catalog";
import { api } from "./account";
import { useStore } from "./store";

type SP = { id: number; name: string; description: string; howToUse: string; cost: number; stock: number; available: boolean; unlimited: boolean };
type Ours = { productId: string; plan: string; name: string; label: string; price: number };
type Fivesim = { configured: boolean; currency: string; perUsd: number; markup: number; min: number; balance?: number | null; error?: string; sample?: { country: string; name: string; price: number; count: number }[] };
type Data = { fivesim?: Fivesim; configured: boolean; rate: { rate: number; source: string }; ours: Ours[]; map: { productId: string; plan: string; supplierId: number }[]; products: SP[]; balance: number | null; test?: boolean; error?: string;
  cr?: { configured: boolean; wallet: { address: string; usdt: number; bnb: number } | { error: string } | null };
  qd?: { configured: boolean; balance: { available: number; reserved: number } | { error: string } | null };
  cb?: { configured: boolean; balance: { balance: number; currency: string } | { error: string } | null } };

const round = (n: number) => Math.round(n / 1000) * 1000;

/** Supplier (Insight Store) catalog: cost in Toman at today's Tether rate, next to our price, with one-click import and mapping. */
export function AdminSupplier() {
  const { notify } = useStore();
  const [d, setD] = useState<Data | null>(null);
  const [markup, setMarkup] = useState(25);
  const [q, setQ] = useState("");
  const load = useCallback(async () => { const r = await api<Data>("/api/admin/supplier"); if (r.ours) setD(r); }, []);
  useEffect(() => { load(); }, [load]);
  const list = useMemo(() => (d?.products ?? []).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name)), [d, q]);
  if (!d) return <p className="muted">…</p>;
  const rate = d.rate.rate;
  const key = (o: { productId: string; plan: string }) => `${o.productId}|${o.plan}`;
  const mappedTo = (sid: number) => d.map.filter((m) => m.supplierId === sid);

  const connect = async (sid: number, value: string) => {
    const old = mappedTo(sid)[0];
    if (old) await api("/api/admin/supplier", { body: { productId: old.productId, plan: old.plan, supplierId: null } });
    if (value) { const [productId, plan] = value.split("|"); await api("/api/admin/supplier", { body: { productId, plan, supplierId: sid } }); }
    notify(value ? "وصل شد؛ از این به بعد کد خودکار خریده و تحویل می‌شود" : "اتصال برداشته شد");
    load();
  };

  return (
    <>
      <header className="dash-h"><h1>تأمین‌کننده</h1><p className="muted">کاتالوگ اینسایت استور با قیمت تمام‌شده به تومان (تتر امروز {money(rate)} تومان). محصولی که وصل شود، بعد از پرداخت مشتری خودکار از کیف پول تأمین‌کننده خریده و کدش تحویل می‌شود؛ اول از انبار کدهای خودمان برداشته می‌شود.</p></header>
      <SyncCard />
      <FivesimCard f={d.fivesim} rate={rate} />
      <div className="dash-sec">
        <b>Cryptorefills (گیفت‌کارت‌ها)</b>
        {!d.cr?.configured ? (
          <p className="muted">وصل نیست. در Vercel این‌ها را بگذار: <span className="en sel">CRYPTOREFILLS_PARTNER_ID</span>، <span className="en sel">CR_WALLET_KEY</span> (کلید خصوصی یک کیف پول جدا روی شبکه BNB Smart Chain) و <span className="en sel">CR_EMAIL</span>. در کیف پول USDT (BEP20) و کمی BNB برای کارمزد بریز.</p>
        ) : d.cr.wallet && "address" in d.cr.wallet ? (
          <p className="muted">کیف پول: <span className="en sel">{d.cr.wallet.address}</span> • <b className="num">{fa(d.cr.wallet.usdt.toFixed(2))}</b> تتر ≈ {money(round(d.cr.wallet.usdt * rate))} تومان • <span className="num">{fa(d.cr.wallet.bnb.toFixed(4))}</span> BNB برای کارمزد{d.cr.wallet.bnb < 0.002 && <b className="bad"> (کم است)</b>}</p>
        ) : <p className="adm-split warn">خطا در خواندن کیف پول: <span className="en">{d.cr.wallet && "error" in d.cr.wallet ? d.cr.wallet.error : ""}</span></p>}
      </div>
      <div className="dash-sec">
        <b>QuickDigi (اکانت‌ها و کدهای تکمیلی)</b>
        {!d.qd?.configured ? (
          <p className="muted">وصل نیست. در Vercel کلید API را با نام <span className="en sel">QUICKDIGI_API_KEY</span> بگذار و دوباره دیپلوی کن. کیف پول را از ربات تلگرام QuickDigi با USDT (BEP20) یا Binance Pay شارژ کن.</p>
        ) : d.qd.balance && "available" in d.qd.balance ? (
          <p className="muted">موجودی کیف پول: <b className="num">{fa(d.qd.balance.available.toFixed(2))}</b> تتر ≈ {money(round(d.qd.balance.available * rate))} تومان{d.qd.balance.reserved > 0 && <> • رزرو برای سفارش‌های در جریان: <span className="num">{fa(d.qd.balance.reserved.toFixed(2))}</span></>}{d.qd.balance.available < 20 && <b className="bad"> (کم است)</b>}. محصولات وصل‌شده در کد مشخص‌اند (فیلد <span className="en">qd</span>) و فقط سفارش‌های زیر ۱۵ تتر خودکار خریده می‌شوند.</p>
        ) : <p className="adm-split warn">خطا در خواندن کیف پول: <span className="en">{d.qd.balance && "error" in d.qd.balance ? d.qd.balance.error : ""}</span></p>}
      </div>
      <div className="dash-sec">
        <b>Canboso (اکانت‌های ارزان‌تر)</b>
        {!d.cb?.configured ? (
          <p className="muted">وصل نیست. در Vercel کلید API (که با <span className="en">tgb_</span> شروع می‌شود) را با نام <span className="en sel">CANBOSO_API_KEY</span> بگذار و دوباره دیپلوی کن. کیف پول را از ربات Binance کانبوسو با USDT شارژ کن.</p>
        ) : d.cb.balance && "balance" in d.cb.balance ? (
          <p className="muted">موجودی کیف پول: <b className="num">{fa(d.cb.balance.balance.toFixed(2))}</b> {d.cb.balance.currency === "USD" ? "دلار" : d.cb.balance.currency} ≈ {money(round(d.cb.balance.balance * rate))} تومان{d.cb.balance.balance < 15 && <b className="bad"> (کم است)</b>}. محصولات وصل‌شده در کد مشخص‌اند (فیلد <span className="en">cb</span>). موجودی کانبوسو از هر محصول چند عدد است؛ وقتی تمام شود، پرداخت آن محصول بسته می‌شود.</p>
        ) : <p className="adm-split warn">خطا در خواندن کیف پول: <span className="en">{d.cb.balance && "error" in d.cb.balance ? d.cb.balance.error : ""}</span></p>}
      </div>
      {!d.configured ? (
        <div className="dash-sec"><b>هنوز وصل نیست</b><p className="muted">کلید API را در Vercel با نام <span className="en sel">INSIGHT_API_KEY</span> بگذار و دوباره دیپلوی کن. برای امتحان بدون خرج، <span className="en sel">INSIGHT_TEST_MODE=1</span> را هم بگذار.</p></div>
      ) : (
        <>
          <div className="sup-top">
            <div className="dash-sec sup-stat"><small className="muted">موجودی کیف پول</small><b className="num">{d.balance === null ? "؟" : `${fa(d.balance.toFixed(2))} تتر`}</b>{d.balance !== null && <small className="muted num">≈ {money(round(d.balance * rate))} تومان</small>}</div>
            <div className="dash-sec sup-stat"><small className="muted">محصولات</small><b className="num">{fa(d.products.filter((p) => p.available).length)} موجود از {fa(d.products.length)}</b></div>
            <div className="dash-sec sup-stat"><small className="muted">سود پیشنهادی برای محصول جدید</small><b><input className="adm-in ltr sup-mk" type="number" min={0} max={300} value={markup} onChange={(e) => setMarkup(Number(e.target.value) || 0)} />٪</b></div>
          </div>
          {d.test && <p className="adm-split warn">حالت آزمایشی API روشن است؛ کدها با TEST- شروع می‌شوند و پولی خرج نمی‌شود.</p>}
          {d.error && <p className="adm-split warn">خطا از API تأمین‌کننده: <span className="en">{d.error}</span></p>}
          <input className="adm-in sup-q" placeholder="جست‌وجو در محصولات تأمین‌کننده" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="sup-tbl-w">
            <table className="sup-tbl">
              <thead><tr><th>محصول تأمین‌کننده</th><th>موجودی</th><th>قیمت تمام‌شده</th><th>وصل به محصول ما</th><th>قیمت ما / سود</th><th /></tr></thead>
              <tbody>
                {list.map((p) => {
                  const costT = round(p.cost * rate);
                  const m = mappedTo(p.id)[0];
                  const ours = m ? d.ours.find((o) => key(o) === key(m)) : undefined;
                  const margin = ours ? ours.price - costT : 0;
                  const suggest = round(costT * (1 + markup / 100));
                  return (
                    <tr key={p.id} className={p.available ? "" : "off"}>
                      <td><b className="en">{p.name}</b>{p.description && <small className="muted">{p.description.slice(0, 120)}</small>}</td>
                      <td className="num">{p.unlimited ? "∞" : fa(p.stock)}</td>
                      <td><b className="num">{money(costT)}</b><small className="muted num en">{p.cost} USDT</small></td>
                      <td>
                        <select className="adm-in" value={m ? key(m) : ""} onChange={(e) => connect(p.id, e.target.value)}>
                          <option value="">وصل نیست</option>
                          {d.ours.map((o) => <option key={key(o)} value={key(o)}>{o.name} • {o.label}</option>)}
                        </select>
                      </td>
                      <td>{ours ? <><b className="num">{money(ours.price)}</b><small className={`num ${margin < 0 ? "bad" : "ok"}`}>{margin < 0 ? "ضرر " : "سود "}{money(Math.abs(margin))} ({fa(Math.round((margin / Math.max(1, costT)) * 100))}٪)</small></> : <small className="muted">پیشنهاد: <span className="num">{money(suggest)}</span></small>}</td>
                      <td>{!m && p.available && <a className="link" href={`/admin/products/new?${new URLSearchParams({ ix: String(p.id), name: p.name, desc: p.description.slice(0, 300), price: String(suggest), label: "یک کد" })}`}>ساخت محصول</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!list.length && <p className="muted">محصولی پیدا نشد.</p>}
        </>
      )}
    </>
  );
}

/** 5sim virtual numbers: whether the key is set, wallet balance and today's sample prices. */
function FivesimCard({ f, rate }: { f?: Fivesim; rate: number }) {
  if (!f) return null;
  const toman = (n: number) => round((n / f.perUsd) * rate);
  return (
    <div className="dash-sec">
      <b>شماره مجازی (5sim)</b>
      {!f.configured ? (
        <p className="muted">کلید API را در Vercel با نام <span className="en sel">FIVESIM_API_KEY</span> بگذار و دوباره دیپلوی کن. تا وقتی کلید نیست، صفحه شماره مجازی همان قیمت‌های ثابت قبلی را نشان می‌دهد.</p>
      ) : (
        <>
          <p className="muted">
            موجودی: <b className="num">{f.balance === null || f.balance === undefined ? "؟" : `${fa(f.balance)} ${f.currency === "USD" ? "دلار" : "روبل"}`}</b>
            {typeof f.balance === "number" && <> ≈ <span className="num">{money(toman(f.balance))}</span> تومان</>}
            {" "}• سود <span className="num">{fa(f.markup)}</span>٪ • حداقل قیمت <span className="num">{money(f.min)}</span>
            {f.currency === "RUB" && <> • هر دلار <span className="num">{fa(f.perUsd)}</span> روبل</>}
          </p>
          {f.error && <p className="adm-split warn">خطا از 5sim: <span className="en">{f.error}</span></p>}
          {f.sample?.length ? <p className="muted">ارزان‌ترین تلگرام امروز: {f.sample.map((o) => `${o.name} ${money(o.price)}`).join("، ")}</p> : null}
        </>
      )}
    </div>
  );
}

type SyncChange = { productId: string; plan: string; kind: "price" | "out" | "back" | "jump"; from?: number; to?: number };
type SyncRun = { id: number; trigger: string; startedAt: string; finishedAt: string | null; summary: { checked: number; out: number; changes: SyncChange[]; errors: string[]; newAtSuppliers: number } | null };
type SyncOption = { productId: string; plan: string; name: string; src: string; extId: string; cost: number | null; available: boolean; stock: number | null; note: string | null; out: boolean; ratio: number; held: boolean };
type SyncData = { every: number; runs: SyncRun[]; options: SyncOption[]; fresh: { src: string; id: string; name: string; cost: number | null; available: boolean; since: string }[] };

const SRC: Record<string, string> = { ix: "اینسایت", qd: "QuickDigi", cb: "Canboso" };
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "همین الان" : m < 60 ? `${fa(m)} دقیقه پیش` : m < 1440 ? `${fa(Math.round(m / 60))} ساعت پیش` : `${fa(Math.round(m / 1440))} روز پیش`;
};
const optName = (productId: string, plan: string) => {
  const p = ALL_PRODUCTS.find((x) => x.id === productId);
  return p ? `${p.name} • ${optionLabel(p, plan)}` : productId;
};

/** Automatic sync: when it last ran, what changed, options closed for stock or a big price move, and new supplier products. */
function SyncCard() {
  const { notify } = useStore();
  const [s, setS] = useState<SyncData | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api<SyncData>("/api/admin/sync"); if (r.runs) setS(r); }, []);
  useEffect(() => { load(); }, [load]);
  const now = async () => {
    setBusy(true);
    const r = await api<SyncData & { ran: boolean }>("/api/admin/sync", { body: {} });
    setBusy(false);
    if (r.runs) setS(r);
    notify(r.error ? "همگام‌سازی انجام نشد" : r.ran ? "قیمت‌ها و موجودی به‌روز شد" : "همین الان یک همگام‌سازی در جریان است");
  };
  if (!s) return null;
  const last = s.runs.find((r) => r.finishedAt);
  const changes = s.runs.flatMap((r) => r.summary?.changes ?? []).slice(0, 12);
  const errors = last?.summary?.errors ?? [];
  const closed = s.options.filter((o) => o.out);
  const held = s.options.filter((o) => o.held);
  return (
    <div className="dash-sec">
      <b>همگام‌سازی خودکار قیمت و موجودی</b>
      <p className="muted">
        هر {fa(s.every)} دقیقه (با اولین بازدید سایت) و هر شب، قیمت و موجودی {fa(s.options.length)} گزینه‌ای که خودکار خریده می‌شوند از تأمین‌کننده‌ها خوانده می‌شود.
        اگر قیمت تأمین‌کننده عوض شود، قیمت ما با همان درصد سود تغییر می‌کند؛ اگر ناموجود شود، آن گزینه در سایت «ناموجود» می‌شود تا دوباره بیاید.
        {last ? <> آخرین اجرا: <b>{ago(last.finishedAt!)}</b>.</> : " هنوز اجرا نشده."}
        {" "}<button type="button" className="link" disabled={busy} onClick={now}>{busy ? "در حال همگام‌سازی…" : "همگام‌سازی الان"}</button>
      </p>
      {errors.length > 0 && <p className="adm-split warn">خطا در آخرین اجرا: <span className="en">{errors.join(" • ")}</span></p>}
      {held.length > 0 && <p className="adm-split warn">تغییر قیمت خیلی بزرگ (بیش از ۶۰٪ گران‌تر یا نصف شده) و خودکار اعمال نشد؛ گران‌شده‌ها تا بررسی تو ناموجودند: {held.map((o) => `${optName(o.productId, o.plan)} (×${fa(o.ratio.toFixed(2))})`).join("، ")}. قیمت جدید را در کد یا پنل محصول بگذار.</p>}
      {closed.length > 0 && <p className="muted">ناموجود در سایت ({fa(closed.length)}): {closed.map((o) => `${optName(o.productId, o.plan)} از ${SRC[o.src] ?? o.src}${o.note === "missing" ? " (در لیست تأمین‌کننده نیست)" : o.note === "over_15" ? " (بالای ۱۵ تتر)" : ""}`).join("، ")}</p>}
      {changes.length > 0 && <p className="muted">تغییرات اخیر: {changes.map((c) => `${optName(c.productId, c.plan)}: ${c.kind === "out" ? "ناموجود شد" : c.kind === "back" ? "دوباره موجود شد" : `هزینه ${fa(c.from ?? 0)} ← ${fa(c.to ?? 0)} تتر${c.kind === "jump" ? " (اعمال نشد)" : ""}`}`).join("، ")}</p>}
      {s.fresh.length > 0 && (
        <details>
          <summary>{fa(s.fresh.length)} محصول تازه نزد تأمین‌کننده‌ها که هنوز در سایت نیست</summary>
          <ul className="muted">{s.fresh.map((f) => <li key={`${f.src}|${f.id}`}><span className="en">{f.name}</span> • {SRC[f.src] ?? f.src} <span className="en">{f.id}</span>{f.cost !== null && <> • <span className="num">{fa(f.cost)}</span> تتر</>}{!f.available && " • ناموجود"} • {ago(f.since)}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
