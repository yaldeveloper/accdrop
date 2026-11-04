"use client";

import Link from "next/link";
import { DELIVERY, extrasLabel, isSub, optionLabel, productById } from "@/lib/catalog";
import { STAGES, STATUS_TITLE, isPaid, passWindow, stageOf, type Order } from "@/lib/account";
import { fa, faDate, money } from "@/lib/format";
import { INSTALLMENTS } from "@/lib/billing";
import { BrandLogo, Icon } from "./brand";
import { NumberBox } from "./numbers";

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
  const sp = order.split;
  /** A paid «دنگ» share waits for the rest of the group before activation. */
  const waiting = paid && sp && sp.status === "open";
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
          {waiting ? <>
            <div className="od-split">
              <b>منتظر بقیه گروه</b>
              <div className="dg-bar"><i style={{ width: `${Math.min(100, (sp.paid / Math.max(1, sp.seats)) * 100)}%` }} /></div>
              <small className="muted"><span className="num">{fa(sp.paid)}</span> از <span className="num">{fa(sp.seats)}</span> نفر سهمشان را داده‌اند. وقتی گروه کامل شود، اشتراکت فعال می‌شود و پیامک می‌گیری.</small>
            </div>
            <Link className="btn btn-paper" href={`/dong/${sp.code}`}>صفحه دنگ و لینک دعوت <Icon id="arrow" className="arrow" /></Link>
          </> : paid ? <>
            {sp && <p className="od-tip"><Link className="link" href={`/dong/${sp.code}`}>سهم تو از دنگ <span className="en">{sp.code}</span></Link></p>}
            <OrderTimeline order={order} now={now} />
            {s < 2 ? <p className="muted od-tip">{order.lines.some((l) => l.number) ? "شماره را در اپ وارد کن؛ کد تأیید در همین صفحه، کنار شماره نمایش داده می‌شود." : "لازم نیست این صفحه باز بماند؛ وقتی فعال شد پیامک می‌گیری."}</p>
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
                    {extrasLabel(l) && <small className="od-x">{extrasLabel(l)}</small>}
                    {l.members?.length ? <small className="ltr-i">بقیه اعضا: <span className="en">{l.members.join("، ")}</span></small> : null}
                    {l.type === "own" && l.email && <small className="ltr-i">فعال‌سازی روی <span className="en">{l.email}</span></small>}
                    {l.type === "username" && l.username && <small className="ltr-i">ارسال به <span className="en">{l.username}</span></small>}
                    {s === 2 && isSub(p) && <small className="ok">فعال تا {faDate(w.end, false)}</small>}
                    {paid && l.number && l.lineId ? <NumberBox code={order.code} lineId={l.lineId} initial={l.number} /> : <>
                    {l.secret && <small className="od-secret"><span>{{ code: "کد گیفت‌کارت", number: "شماره", ready: "اطلاعات ورود" }[l.type as "code"] ?? (l.ip ? "مشخصات آی‌پی ثابت" : "اطلاعات تحویل")}</span><b className="en">{l.secret}</b></small>}
                    {paid && !l.secret && (l.type === "code" || l.type === "number" || l.type === "ready") && <small className="muted">به‌محض آماده شدن همین‌جا نمایش داده می‌شود و پیامک می‌گیری.</small>}
                    </>}
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
          {paid && order.payMethod === "bnpl" && <p className="muted od-tip">پرداخت اقساطی با {INSTALLMENTS.provider}؛ قسط‌های بعدی را در اپ {INSTALLMENTS.provider} می‌بینی.</p>}
        </div>
      </div>
      <div className="od-actions">
        <Link className="btn btn-paper" href="/account">رفتن به داشبورد <Icon id="arrow" className="arrow" /></Link>
        {paid && <Link className="btn btn-ghost" href={`/orders/${order.code}/invoice`}>{order.invoice ? "فاکتور رسمی" : "فاکتور"}</Link>}
        <Link className="btn btn-ghost" href={`/account/tickets/new?topic=order&order=${order.code}`}>تیکت برای این سفارش</Link>
      </div>
    </div>
  );
}
