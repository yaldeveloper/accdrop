import type { Metadata } from "next";
import { AdminShell } from "@/components/admin";

export const metadata: Metadata = { title: "مدیریت", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <main className="user-main"><AdminShell>{children}</AdminShell></main>;
}
