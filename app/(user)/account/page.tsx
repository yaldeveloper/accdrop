"use client";

import Link from "next/link";
import { useAccount } from "@/components/account";
import { EmptyState, HeldPass, heldPasses } from "@/components/dashboard";
import { OrderRow } from "@/components/orders";

export default function AccountHome() {
  const { user, orders, now } = useAccount();
  const held = heldPasses(orders, now).sort((a, b) => a.stage - b.stage || a.left - b.left);
  const first = (user?.name || "").split(" ")[0];
  return (
    <>
      <header className="dash-h"><h1>{first ? `سلام ${first}` : "سلام"}</h1><p className="muted">اشتراک‌ها، سفارش‌ها و تیکت‌هایت، یک‌جا.</p></header>
      <div className="dash-sec">
        <h2>پاس‌های من</h2>
        {held.length ? <div className="held-g">{held.map((h, i) => <HeldPass key={i} h={h} />)}</div>
          : <EmptyState title="هنوز پاسی نداری" text="اولین اشتراکت را بگیر؛ چند دقیقه بعد اینجا فعال می‌شود." />}
      </div>
      <div className="dash-two">
        <div className="dash-sec">
          <h2>آخرین سفارش‌ها {orders.length > 3 && <Link className="link" href="/account/orders">همه</Link>}</h2>
          {orders.length ? <div className="ord-list">{orders.slice(0, 3).map((o) => <OrderRow key={o.code} order={o} now={now} />)}</div> : <p className="muted">سفارشی ثبت نشده.</p>}
        </div>
        <div className="dash-sec">
          <h2>پشتیبانی <Link className="link" href="/account/tickets">تیکت‌ها</Link></h2>
          <p className="muted">سؤال یا مشکلی داری؟ از چت آنلاین پایین صفحه یا با یک تیکت بپرس.</p>
          <Link className="btn btn-ghost" href="/account/tickets/new">تیکت جدید</Link>
        </div>
      </div>
    </>
  );
}
