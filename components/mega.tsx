"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES, currentDrop, listed, minPrice, productById, tiersLabel, type Category } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { NEEDS } from "@/lib/search";
import { fa, money } from "@/lib/format";
import { BrandLogo, Icon } from "./brand";
import { catLine } from "@/lib/facts";

export const CATS = Object.keys(CATEGORIES).filter((c) => c !== "all") as Category[];
/** Accent colour per category, used by the menu and category tiles. */
export const CAT_TONE: Record<Category, string> = {
  ai: "#10A37F", code: "#7C8CFF", api: "#D97757", create: "#FF6B8B", work: "#F2B860", apple: "#B8C2CC", game: "#8B6CFF", telegram: "#2AABEE", number: "#B9FF63",
};
export const CAT_LINE: Record<Category, string> = {
  ai: "ChatGPT، Claude، Gemini", code: "Cursor، Lovable و Warp", api: "Claude، Grok و Kimi API", create: "CapCut، Framer، Adobe Express", work: "LinkedIn، Airtable، Duolingo",
  apple: "اپل و گوگل‌پلی", game: "استیم، پلی‌استیشن، پابجی", telegram: "پرمیوم و استارز", number: "شماره برای ثبت‌نام",
};
export const inCat = (c: Category) => listed().filter((p) => p.category === c);

/** «سرویس‌ها» in the header. The panel is portalled to <body> so the header's blur can't trap or clip it. */
export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<Category>("ai");
  const [top, setTop] = useState(84);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const path = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    setTop(document.querySelector(".hd")?.getBoundingClientRect().bottom ?? 84);
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const sc = () => setOpen(false);
    addEventListener("keydown", k);
    addEventListener("scroll", sc, { passive: true });
    return () => { removeEventListener("keydown", k); removeEventListener("scroll", sc); };
  }, [open]);
  const enter = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 90); };
  const leave = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 180); };
  const items = inCat(cat);
  const drop = currentDrop(), dp = drop ? productById(drop.productId) : undefined;

  const panel = (
    <div id="mm-panel" className={`mm-p ${open ? "on" : ""}`} style={{ top }} onMouseEnter={enter} onMouseLeave={leave} aria-hidden={!open} inert={!open}>
      <div className="wrap mm-g">
        <ul className="mm-cats" role="tablist" aria-label="دسته‌ها">
          {CATS.filter((c) => inCat(c).length).map((c) => (
            <li key={c}>
              <button role="tab" aria-selected={c === cat} className={c === cat ? "on" : ""} style={{ "--t": CAT_TONE[c] } as React.CSSProperties}
                onMouseEnter={() => setCat(c)} onFocus={() => setCat(c)} onClick={() => setCat(c)}>
                <i />
                <span><b>{CATEGORIES[c]}</b><small>{catLine(c)}</small></span>
                <em className="num">{fa(inCat(c).length)}</em>
              </button>
            </li>
          ))}
        </ul>
        <div className="mm-items" role="tabpanel">
          <div className="mm-items-h"><b>{CATEGORIES[cat]}</b><Link href={`/services?c=${cat}`}>همه {fa(items.length)} سرویس این دسته <Icon id="arrow" className="arrow" /></Link></div>
          <div className="mm-grid">
            {items.slice(0, 9).map((p) => (
              <Link key={p.id} href={productHref(p)} className="mm-it" onClick={() => setOpen(false)}>
                <span className="mono"><BrandLogo id={p.id} size={20} /></span>
                <span className="mm-it-t"><b className="en">{p.name.replace(/ (Plus|Pro)$/, "")}</b><small>{tiersLabel(p) || p.use}</small></span>
                <small className="num mm-it-p">از {money(minPrice(p))}</small>
              </Link>
            ))}
          </div>
        </div>
        <aside className="mm-side">
          {drop && dp && (
            <Link href={productHref(dp)} className="mm-drop" onClick={() => setOpen(false)}>
              <small>دراپ این هفته</small>
              <b className="en">{dp.name}</b>
              <span><b className="num">{money(drop.price)}</b> تومان <s className="num">{money(drop.was)}</s></span>
            </Link>
          )}
          <Link href="/group" className="mm-group" onClick={() => setOpen(false)}><Icon id="user" /><span><b>خرید گروهی</b><small>با دوستانت بخر، تا ۱۲٪ ارزان‌تر</small></span></Link>
          <div className="mm-needs">
            <small>برای چه کاری؟</small>
            <div>{NEEDS.slice(0, 6).map((n) => <Link key={n.label} href={`/services?need=${encodeURIComponent(n.label)}`}>{n.label}</Link>)}</div>
          </div>
        </aside>
      </div>
    </div>
  );

  return (
    <div className="mm" onMouseEnter={enter} onMouseLeave={leave}>
      <button type="button" className={`mm-t ${open ? "on" : ""}`} aria-expanded={open} aria-controls="mm-panel" onClick={() => setOpen((o) => !o)}>
        سرویس‌ها <svg viewBox="0 0 10 6" width="9" height="6" aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
      </button>
      {mounted && createPortal(panel, document.body)}
      {open && mounted && createPortal(<div className="mm-scrim" style={{ top }} onClick={() => setOpen(false)} />, document.body)}
    </div>
  );
}

/** Mobile menu: a drawer with categories (expandable) and the main links. */
export function MobileMenu({ open, onClose, onSearch, onChat }: { open: boolean; onClose: () => void; onSearch: () => void; onChat: () => void }) {
  const [cat, setCat] = useState<Category | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const path = usePathname();
  useEffect(() => { onClose(); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className={`dr-scrim ${open ? "on" : ""}`} onClick={onClose} aria-hidden="true" />
      <nav className={`dr ${open ? "on" : ""}`} aria-label="منو" aria-hidden={!open} inert={!open}>
        <div className="dr-h"><b>منو</b><button onClick={onClose} aria-label="بستن">×</button></div>
        <button className="dr-search" onClick={() => { onClose(); onSearch(); }}><Icon id="search" />جست‌وجوی سرویس…</button>
        <small className="dr-k">دسته‌ها</small>
        <ul className="dr-cats">
          {CATS.filter((c) => inCat(c).length).map((c) => (
            <li key={c} className={cat === c ? "on" : ""}>
              <button onClick={() => setCat(cat === c ? null : c)} aria-expanded={cat === c} style={{ "--t": CAT_TONE[c] } as React.CSSProperties}>
                <i /><span>{CATEGORIES[c]}</span><em className="num">{fa(inCat(c).length)}</em>
                <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
              </button>
              {cat === c && (
                <div className="dr-items">
                  {inCat(c).map((p) => (
                    <Link key={p.id} href={productHref(p)}><span className="mono"><BrandLogo id={p.id} size={18} /></span><span className="en">{p.name}</span><small className="num">{money(minPrice(p))}</small></Link>
                  ))}
                  <Link href={`/services?c=${c}`} className="dr-all">همه {CATEGORIES[c]}</Link>
                </div>
              )}
            </li>
          ))}
        </ul>
        <small className="dr-k">اک‌دراپ</small>
        <div className="dr-links">
          <Link href="/account/orders">سفارش‌های من و پیگیری</Link>
          <Link href="/group">خرید گروهی</Link>
          {currentDrop() && <Link href="/#drop">دراپ‌ها</Link>}
          <Link href="/blog">بلاگ</Link>
          <Link href="/guarantee">گارانتی و بازگشت وجه</Link>
          <Link href="/reseller">نمایندگی فروش</Link>
          <button onClick={() => { onClose(); onChat(); }}>چت با پشتیبانی</button>
        </div>
      </nav>
    </>,
    document.body,
  );
}
