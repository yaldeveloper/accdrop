"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminOrders } from "@/components/admin";

function Inner() {
  return <AdminOrders initialStatus={useSearchParams().get("status") ?? "open"} />;
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
