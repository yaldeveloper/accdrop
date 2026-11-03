"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "@/components/account";
import { Icon } from "@/components/brand";
import { fa } from "@/lib/format";

const NAV = [
  ["/account", "پاس‌های من"],
  ["/account/orders", "سفارش‌ها"],
  ["/account/tickets", "تیکت‌ها"],
  ["/account/reseller", "نمایندگی"],
  ["/account/profile", "حساب کاربری"],
] as const;

export default function AccountLayout({ children }: { children: ReactNode }) {
  const { ready, user, logout } = useAccount();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => { if (ready && !user) router.replace(`/login?next=${encodeURIComponent(path + window.location.search)}`); }, [ready, user, path, router]);
  if (!ready || !user) return <div className="wrap dash-wait" />;
  return (
    <div className="wrap dash">
      <aside className="dash-side">
        <div className="dash-me">
          <span className="dash-av">{(user.name || "؟").trim().charAt(0)}</span>
          <div><b>{user.name || "کاربر اک‌دراپ"}</b><small className="num muted">{fa(user.mobile)}</small></div>
        </div>
        <nav aria-label="داشبورد">
          {NAV.map(([href, label]) => <Link key={href} href={href} className={(href === "/account" ? path === href : path.startsWith(href)) ? "on" : ""}>{label}</Link>)}
          {user.isAdmin && <Link href="/admin">پنل مدیریت</Link>}
          <button onClick={async () => { await logout(); router.push("/"); }}>خروج <Icon id="arrow" className="arrow" /></button>
        </nav>
      </aside>
      <div className="dash-main">{children}</div>
    </div>
  );
}
