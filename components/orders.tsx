"use client";

import Link from "next/link";
import { DELIVERY, isSub, optionLabel, productById } from "@/lib/catalog";
import { STAGES, STATUS_TITLE, isPaid, passWindow, stageOf, type Order } from "@/lib/account";
import { fa, faDate, money } from "@/lib/format";
import { BrandLogo, Icon } from "./brand";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function StatusChip({ order, now }: { order: Order; now?: number }) {
  const cls = isPaid(order) ? `s${stageOf(order)}` : "sx";
  return <span className={`chip ${cls}`}><i />{STATUS_TITLE[order.status]}</span>;
}

/** Paid → activating → active, with times and a live countdown. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function OrderTimeline({ order, now }: { order: Order; now?: number }) {
  const s = stageOf(order);
  const eta = Math.max(...order.lines.map((l) => productById(l.id).etaMinutes));
  const items = [
    { t: STAGES[0], d: faDate(order.paidAt ?? order.createdAt) },
    { t: STAGES[1], d: s === 1 ? (eta ? <>معمولاً کمتر از <span className="num">{fa(eta)}</span> دقیقه</> : "در حال تحویل") : s > 1 ? "انجام شد" : "در صف" },
    { t: STAGES[2], d: s === 2 && order.activatedAt ? faDate(order.activatedAt) : "پیامک می‌کنیم" },
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

export function OrderDetail({ order, now, onPay, paying }: { order: Order; now: number; onPay?: () => void; paying?: boolean }) {
  const s = stageOf(order);
  const paid = isPaid(order);
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
          {paid ? <>
            <OrderTimeline order={order} now={now} />
            {s < 2 ? <p className="muted od-tip">لازم نیست این صفحه باز بماند؛ وقتی فعال شد پیامک می‌گیری.</p>
              : <p className="od-tip ok">همه‌چیز فعال است. از خریدت لذت ببر.</p>}
          </> : order.status === "refunded" ? <p className="muted od-tip">مبلغ این سفارش به کارتت برگشت داده شد.</p> : <>
            <p className="od-tip">{order.status === "pending" ? "این سفارش هنوز پرداخت نشده." : "پرداخت انجام نشد. اگر از حسابت کم شده، بانک تا ۷۲ ساعت برمی‌گرداند."}</p>
            {onPay && <button className="btn btn-paper" onClick={onPay} disabled={paying}>{paying ? "در حال اتصال به درگاه…" : <>پرداخت <span className="num">{money(order.total)}</span> تومان</>}</button>}
          </>}
        </div>
        <div className="od-card">
          <h2>اقلام سفارش</h2>
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
                    {l.secret && <small className="od-secret"><span>{{ code: "کد گیفت‌کارت", number: "شماره", ready: "اطلاعات ورود" }[l.type as "code"] ?? "اطلاعات تحویل"}</span><b className="en">{l.secret}</b></small>}
                    {paid && !l.secret && (l.type === "code" || l.type === "number" || l.type === "ready") && <small className="muted">به‌محض آماده شدن همین‌جا نمایش داده می‌شود و پیامک می‌گیری.</small>}
                  </div>
                  <span className="num">{money(l.price)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="co-totals">
            <div><dt>جمع</dt><dd className="num">{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="disc"><dt>تخفیف</dt><dd className="num">−{money(order.discount)}</dd></div>}
            <div className="tot"><dt>{paid ? "پرداخت شده" : "مبلغ سفارش"}</dt><dd><b className="num">{money(order.total)}</b> <small>تومان</small></dd></div>
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
