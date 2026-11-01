"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "@/components/account";
import { OrderDetail } from "@/components/orders";
import { Icon } from "@/components/brand";

export default function OrderPage() {
  const { code } = useParams<{ code: string }>();
  const { ready, user, now, orderByCode } = useAccount();
  const order = orderByCode(decodeURIComponent(code));
  if (!ready) return null;
  return (
    <div className="wrap od-wrap">
      <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><Link href="/account/orders">سفارش‌ها</Link><span>/</span><span className="en">{code}</span></nav>
      {order ? <OrderDetail order={order} now={now} /> : (
        <div className="co-empty">
          <h1>سفارش پیدا نشد</h1>
          <p className="muted">{user ? "کد را دوباره بررسی کن یا به پشتیبانی پیام بده." : "برای دیدن سفارش‌هایت وارد حسابت شو."}</p>
          <Link className="btn btn-paper" href={user ? "/account/orders" : `/login?next=/orders/${code}`}>{user ? "همه سفارش‌ها" : "ورود"} <Icon id="arrow" className="arrow" /></Link>
        </div>
      )}
    </div>
  );
}
