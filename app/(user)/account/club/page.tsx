"use client";

import { useAccount } from "@/components/account";
import { ClubCard, TierList } from "@/components/dashboard";

export default function ClubPage() {
  const { orders } = useAccount();
  return (
    <>
      <header className="dash-h"><h1>کلاب اک‌دراپ</h1><p className="muted">هر ۱۰۰ هزار تومان خرید، یک امتیاز. سطحت با تعداد خریدها بالا می‌رود.</p></header>
      <div className="dash-sec"><ClubCard orders={orders} /></div>
      <div className="dash-sec"><h2>سطح‌ها</h2><TierList orders={orders} /></div>
    </>
  );
}
