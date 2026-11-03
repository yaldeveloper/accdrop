"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { NewTicket } from "@/components/tickets";

function Inner() {
  const sp = useSearchParams();
  return <NewTicket topic={sp.get("topic") ?? undefined} q={sp.get("q") ?? undefined} order={sp.get("order") ?? undefined} />;
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
