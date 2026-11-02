"use client";

import { useAccount } from "@/components/account";
import { EmptyState } from "@/components/dashboard";
import { OrderRow } from "@/components/orders";

export default function OrdersPage() {
  const { orders, now } = useAccount();
  return (
    <>
      <header className="dash-h"><h1>سفارش‌ها</h1><p className="muted">روی هر سفارش بزن تا مراحلش را ببینی.</p></header>
      {orders.length ? <div className="ord-list">{orders.map((o) => <OrderRow key={o.code} order={o} now={now} />)}</div>
        : <EmptyState title="سفارشی نداری" text="وقتی خرید کنی، همه سفارش‌ها و وضعیتشان اینجاست." />}
    </>
  );
}
