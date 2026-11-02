import type { ReactNode } from "react";
import Link from "next/link";

/** Simple, readable text page for policies (guarantee, terms, contact). */
export function DocPage({ title, lead, updated, children }: { title: string; lead: string; updated?: string; children: ReactNode }) {
  return (
    <main className="doc">
      <div className="wrap doc-g">
        <aside className="doc-side">
          <nav aria-label="صفحه‌های راهنما">
            <Link href="/guarantee">شرایط ضمانت و بازگشت وجه</Link>
            <Link href="/terms">قوانین و مقررات</Link>
            <Link href="/contact">تماس و پشتیبانی</Link>
            <Link href="/reseller">نمایندگی فروش</Link>
          </nav>
        </aside>
        <article className="doc-body">
          <h1>{title}</h1>
          <p className="doc-lead">{lead}</p>
          {updated && <small className="muted">آخرین به‌روزرسانی: {updated}</small>}
          {children}
        </article>
      </div>
    </main>
  );
}
