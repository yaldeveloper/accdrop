"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/components/account";
import { Dots } from "@/components/brand";

/** Stand-in for the bank gateway while Zarinpal is not connected. */
function TestGateway() {
  const order = useSearchParams().get("order") ?? "";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async (ok: boolean) => {
    setBusy(true);
    const r = await api<{ url: string }>("/api/pay/test", { body: { order, ok } });
    router.replace(r.url ?? `/orders/${order}`);
  };
  return (
    <div className="wrap co-empty">
      <Dots size={8} />
      <h1>درگاه آزمایشی</h1>
      <p className="muted">درگاه زرین‌پال هنوز وصل نشده. اینجا پرداخت سفارش <b className="en">{order}</b> شبیه‌سازی می‌شود و پولی کم نمی‌شود.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-paper" disabled={busy} onClick={() => go(true)}>پرداخت موفق</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => go(false)}>انصراف از پرداخت</button>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><TestGateway /></Suspense>;
}
