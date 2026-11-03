"use client";

import { useParams } from "next/navigation";
import { AdminProduct } from "@/components/admin-products";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <AdminProduct id={decodeURIComponent(id)} />;
}
