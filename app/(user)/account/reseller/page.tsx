"use client";

import { ResellerPanel } from "@/components/reseller";

export default function ResellerDashPage() {
  return (
    <>
      <header className="dash-h"><h1>نمایندگی</h1><p className="muted">وضعیت درخواست، قیمت همکاری و لینک معرفی تو.</p></header>
      <ResellerPanel />
    </>
  );
}
