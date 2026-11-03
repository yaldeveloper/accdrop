"use client";

import { useParams } from "next/navigation";
import { AdminPost } from "@/components/admin-blog";

export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  return <AdminPost slug={decodeURIComponent(slug)} />;
}
