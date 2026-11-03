"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES, PRODUCTS, minPrice, type Category } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { NEEDS } from "@/lib/search";
import { fa, money } from "@/lib/format";
import { BrandLogo, Icon } from "./brand";

const COLS: Category[][] = [["ai", "code"], ["create", "work"], ["telegram", "apple", "number"]];

/** «همه سرویس‌ها» in the header: opens on hover (with a short intent delay) or click, closes on leave, Escape or navigation. */
export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);
  const enter = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 120); };
  const leave = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 160); };

  return (
    <div className="mm" onMouseEnter={enter} onMouseLeave={leave}>
      <button type="button" className={`mm-t ${open ? "on" : ""}`} aria-expanded={open} aria-controls="mm-panel" onClick={() => setOpen((o) => !o)}>
        همه سرویس‌ها <svg viewBox="0 0 10 6" width="9" height="6" aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
      </button>
      <div id="mm-panel" className={`mm-p ${open ? "on" : ""}`} hidden={!open}>
        <div className="wrap mm-g">
          {COLS.map((cats, i) => (
            <div key={i} className="mm-col">
              {cats.map((c) => (
                <div key={c} className="mm-cat">
                  <Link href={`/services?c=${c}`} className="mm-h">{CATEGORIES[c]}</Link>
                  <ul>
                    {PRODUCTS.filter((p) => p.category === c).map((p) => (
                      <li key={p.id}><Link href={productHref(p)}>
                        <span className="mono"><BrandLogo id={p.id} size={16} /></span>
                        <span className="en">{p.name}</span>
                        <small className="num">{money(minPrice(p))}</small>
                      </Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
          <aside className="mm-side">
            <b>برای چه کاری؟</b>
            <div>{NEEDS.map((n) => <Link key={n.label} href={`/services?need=${encodeURIComponent(n.label)}`}>{n.label}</Link>)}</div>
            <Link className="mm-all" href="/services">همه {fa(PRODUCTS.length)} سرویس <Icon id="arrow" className="arrow" /></Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
