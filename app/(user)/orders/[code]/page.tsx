"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, useAccount, useOrder } from "@/components/account";
import { OrderDetail } from "@/components/orders";
import { Icon } from "@/components/brand";
import { useStore } from "@/components/store";
import { GiftOrderPanel } from "@/components/gift";
import { GIFT_ID } from "@/lib/gift";

export default function OrderPage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = decodeURIComponent(raw).toUpperCase();
  const router = useRouter();
  const { ready, user, now } = useAccount();
  const { notify } = useStore();
  const { order, state } = useOrder(code);
  const [paying, setPaying] = useState(false);
  if (!ready || (user && state === "loading")) return <div className="wrap od-wrap dash-wait" />;

  const pay = async () => {
    setPaying(true);
    const r = await api<{ payUrl: string }>(`/api/orders/${encodeURIComponent(code)}/pay`, { method: "POST", body: {} });
    if (!r.payUrl) { setPaying(false); notify(r.error === "credit_expired" ? "اعتبار این سفارش آزاد شده؛ دوباره از سبد خرید پرداخت کن." : "اتصال به درگاه انجام نشد. دوباره امتحان کن."); return; }
    if (r.payUrl.startsWith("/")) router.push(r.payUrl); else window.location.href = r.payUrl;
  };

  return (
    <div className="wrap od-wrap">
      <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><Link href="/account/orders">سفارش‌ها</Link><span>/</span><span className="en">{code}</span></nav>
      {order?.lines.some((l) => l.id === GIFT_ID) && <GiftOrderPanel orderCode={order.code} />}
      {order ? <OrderDetail order={order} now={now} onPay={pay} paying={paying} /> : (
        <div className="co-empty">
          <h1>سفارش پیدا نشد</h1>
          <p className="muted">{user ? "کد را دوباره بررسی کن یا به پشتیبانی پیام بده." : "برای دیدن سفارش‌هایت وارد حسابت شو."}</p>
          <Link className="btn btn-paper" href={user ? "/account/orders" : `/login?next=/orders/${code}`}>{user ? "همه سفارش‌ها" : "ورود"} <Icon id="arrow" className="arrow" /></Link>
        </div>
      )}
    </div>
  );
}
