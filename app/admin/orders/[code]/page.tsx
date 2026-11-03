"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminOrder } from "@/components/admin";

export default function Page() {
  const { code } = useParams<{ code: string }>();
  return (
    <>
      <nav className="crumbs" aria-label="مسیر"><Link href="/admin/orders">سفارش‌ها</Link><span>/</span><span className="en">{decodeURIComponent(code)}</span></nav>
      <AdminOrder code={decodeURIComponent(code)} />
    </>
  );
}
