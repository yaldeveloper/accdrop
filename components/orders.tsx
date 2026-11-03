"use client";

import Link from "next/link";
import { DELIVERY, isSub, optionLabel, productById } from "@/lib/catalog";
import { DEMO_ACTIVATION_MS, STAGES, passWindow, stageOf, type Order } from "@/lib/account";
import { fa, faDate, money } from "@/lib/format";
import { BrandLogo, Icon } from "./brand";

/** DEMO: a stable fake gift-card code or phone number per order line, until real fulfilment exists. */
function demoSecret(code: string, i: number, kind: "code" | "number") {
  let h = i + 7;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const digits = String(h).padStart(10, "0");
  if (kind === "number") return `+1 (555) ${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let x = h, s = "";
  for (let k = 0; k < 16; k++) { x = (x * 1103515245 + 12345) >>> 0; s += abc[x % abc.length]; }
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12)}`;
}

export function StatusChip({ order, now }: { order: Order; now: number }) {
  const s = stageOf(order, now);
  return <span className={`chip s${s}`}><i />{STAGES[s]}</span>;
}

/** Paid → activating → active, with times and a live countdown. */
export function OrderTimeline({ order, now }: { order: Order; now: number }) {
  const s = stageOf(order, now);
  const left = Math.max(0, Math.ceil((order.createdAt + DEMO_ACTIVATION_MS - now) / 1000));
  const items = [
    { t: STAGES[0], d: faDate(order.createdAt) },
    { t: STAGES[1], d: s === 1 ? <>حدود <span className="num">{fa(left)}</span> ثانیه دیگر</> : s > 1 ? "انجام شد" : "در صف" },
    { t: STAGES[2], d: s === 2 ? faDate(order.createdAt + DEMO_ACTIVATION_MS) : "پیامک می‌کنیم" },
  ];
  return (
    <ol className="tl">
      {items.map((it, i) => (
        <li key={i} className={i < s ? "done" : i === s ? (s === 2 ? "done" : "now") : ""}>
          <span className="tl-dot" />
          <div><b>{it.t}</b><small>{it.d}</small></div>
        </li>
      ))}
    </ol>
  );
}

export function OrderRow({ order, now }: { order: Order; now: number }) {
  return (
    <Link href={`/orders/${order.code}`} className="ord-row">
      <span className="ord-logos">{order.lines.slice(0, 3).map((l, i) => <span className="mono" key={i}><BrandLogo id={l.id} size={18} /></span>)}</span>
      <span className="ord-t"><b className="en">{order.code}</b><small>{order.lines.map((l) => productById(l.id).name).join("، ")}</small></span>
      <span className="ord-d muted">{faDate(order.createdAt, false)}</span>
      <StatusChip order={order} now={now} />
      <span className="ord-p num">{money(order.total)}</span>
      <Icon id="arrow" className="arrow" />
    </Link>
  );
}

export function OrderDetail({ order, now }: { order: Order; now: number }) {
  const s = stageOf(order, now);
  return (
    <div className="od">
      <div className="od-h">
        <div>
          <small className="muted">سفارش</small>
          <h1 className="en">{order.code}</h1>
          <small className="muted">{faDate(order.createdAt)}</small>
        </div>
        <StatusChip order={order} now={now} />
      </div>
      <div className="od-g">
        <div className="od-card">
          <h2>وضعیت</h2>
          <OrderTimeline order={order} now={now} />
          {s < 2 ? <p className="muted od-tip">لازم نیست این صفحه باز بماند؛ وقتی فعال شد پیامک می‌گیری.</p>
            : <p className="od-tip ok">همه‌چیز فعال است. از اشتراک‌هایت لذت ببر.</p>}
        </div>
        <div className="od-card">
          <h2>اشتراک‌ها</h2>
          <ul className="od-lines">
            {order.lines.map((l, i) => {
              const p = productById(l.id);
              const w = passWindow(order, l);
              return (
                <li key={i}>
                  <span className="mono"><BrandLogo id={p.id} size={22} /></span>
                  <div className="od-l">
                    <b className="en">{p.name}</b>
                    <small>{optionLabel(p, l.plan)} • {DELIVERY[l.type].title}</small>
                    {l.type === "own" && l.email && <small className="ltr-i">فعال‌سازی روی <span className="en">{l.email}</span></small>}
                    {l.type === "username" && l.username && <small className="ltr-i">ارسال به <span className="en">{l.username}</span></small>}
                    {s === 2 && isSub(p) && <small className="ok">فعال تا {faDate(w.end, false)}</small>}
                    {s === 2 && l.type === "code" && <small className="od-secret"><span>کد گیفت‌کارت</span><b className="en">{demoSecret(order.code, i, "code")}</b></small>}
                    {s === 2 && l.type === "number" && <small className="od-secret"><span>شماره</span><b className="en">{demoSecret(order.code, i, "number")}</b></small>}
                    {s === 2 && l.type === "ready" && <small className="muted">اطلاعات ورود اکانت اینجا و در پیامک نمایش داده می‌شود (نسخه آزمایشی).</small>}
                  </div>
                  <span className="num">{money(l.price)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="co-totals">
            <div><dt>جمع</dt><dd className="num">{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="disc"><dt>تخفیف</dt><dd className="num">−{money(order.discount)}</dd></div>}
            <div className="tot"><dt>پرداخت شده</dt><dd><b className="num">{money(order.total)}</b> <small>تومان</small></dd></div>
          </dl>
        </div>
      </div>
      <div className="od-actions">
        <Link className="btn btn-paper" href="/account">رفتن به داشبورد <Icon id="arrow" className="arrow" /></Link>
        <a className="btn btn-ghost" href="#">پشتیبانی در تلگرام</a>
      </div>
    </div>
  );
}
