"use client";

import Link from "next/link";
import { isSub, optionLabel, productById, type Selection } from "@/lib/catalog";
import { contentOf } from "@/lib/content";
import { clubOf, daysLeft, passWindow, stageOf, TIERS, type Order, type OrderLine } from "@/lib/account";
import { fa, faDate } from "@/lib/format";
import { BrandLogo, Dots, Glyph, Icon, Wordmark } from "./brand";
import { splitName } from "./pass";

type Held = { order: Order; line: OrderLine; stage: number; start: number; end: number; left: number; total: number };

export function heldPasses(orders: Order[], now: number): Held[] {
  return orders.flatMap((o) => o.lines.filter((l) => isSub(productById(l.id))).map((l) => {
    const w = passWindow(o, l);
    return { order: o, line: l, stage: stageOf(o, now), start: w.start, end: w.end, left: daysLeft(w.end, now), total: w.totalDays };
  }));
}

/** A pass the user owns: logo, days left, renew. */
export function HeldPass({ h }: { h: Held }) {
  const p = productById(h.line.id);
  const [tool, tier] = splitName(p.name);
  const active = h.stage === 2 && h.left > 0;
  const pct = active ? Math.max(4, Math.round((h.left / h.total) * 100)) : 0;
  const renew: Selection = h.line;
  return (
    <div className={`held ${active ? "" : "pending"}`}>
      <div className="held-top">
        <span className="held-logo"><BrandLogo id={p.id} size={26} /></span>
        <span className={`chip ${active ? "s2" : "s1"}`}><i />{active ? "فعال" : h.stage < 2 ? "در حال فعال‌سازی" : "تمام شده"}</span>
      </div>
      <b className="en held-tool">{tool}{tier && <small> {tier}</small>}</b>
      <small className="muted">{optionLabel(p, h.line.plan)}{h.line.email || h.line.username ? <> • <span className="en">{h.line.email || h.line.username}</span></> : null}</small>
      <div className="held-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
      <div className="held-foot">
        <span>{active ? <><b className="num">{fa(h.left)}</b> روز مانده • تا {faDate(h.end, false)}</> : <Link className="link" href={`/orders/${h.order.code}`}>پیگیری سفارش</Link>}</span>
        <Link className="held-renew" href={`/${contentOf(p).slug}?plan=${renew.plan}&type=${renew.type}`}>تمدید <Icon id="arrow" className="arrow" style={{ width: 14, height: 14 }} /></Link>
      </div>
    </div>
  );
}

export function ClubCard({ orders }: { orders: Order[] }) {
  const c = clubOf(orders);
  return (
    <div className="club-mini">
      <div className="mcard">
        <Glyph />
        <div className="top"><Wordmark /><span className="tier">{orders.length ? c.tier.key : "GUEST"}</span></div>
        <div className="bot"><div><small>POINTS</small><b className="num">{fa(c.points)}</b></div><Dots size={6} /></div>
      </div>
      <div className="club-next">
        {c.next ? <p><b className="num">{fa(Math.max(c.toNext, 0))}</b> خرید دیگر تا سطح <b>{c.next.title}</b></p> : <p>بالاترین سطح کلاب را داری.</p>}
        <div className="held-bar"><i style={{ width: `${c.next ? Math.min(100, (c.orders / c.next.from) * 100) : 100}%` }} /></div>
      </div>
    </div>
  );
}

export function TierList({ orders }: { orders: Order[] }) {
  const c = clubOf(orders);
  return (
    <div className="tiers">
      {TIERS.map((t) => (
        <div key={t.key} className={orders.length && t.key === c.tier.key ? "on" : ""}>
          <div className="lv">{t.key}</div><h4>{t.title}</h4>
          <ul>{t.perks.map((x) => <li key={x}>{x}</li>)}</ul>
          <div className="req">از خرید {t.from === 1 ? "اول" : t.from === 3 ? "سوم" : "دهم"}</div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="dash-empty">
      <Dots size={6} />
      <b>{title}</b>
      <p className="muted">{text}</p>
      <Link className="btn btn-paper" href="/#collection">انتخاب ابزار <Icon id="arrow" className="arrow" /></Link>
    </div>
  );
}
