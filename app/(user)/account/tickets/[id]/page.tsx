"use client";

import { useParams } from "next/navigation";
import { TicketThread } from "@/components/tickets";

export default function Page() {
  return <TicketThread id={Number(useParams<{ id: string }>().id)} />;
}
