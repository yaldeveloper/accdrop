"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { productHref } from "@/lib/content";
import { CATEGORIES, minPrice, type Category } from "@/lib/catalog";
import { countIn, searchProducts } from "@/lib/search";
import { liveTasks } from "@/lib/finder";
import { fa, money } from "@/lib/format";
import { BrandLogo, Icon } from "./brand";
import { useStore } from "./store";

/** The command palette: opened with «/» or the search button. Persian and English names both work. */
export function SearchDialog() {
  const { searchOpen, close } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [act, setAct] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const found = query.trim() ? searchProducts(query).slice(0, 7) : [];

  useEffect(() => {
    if (searchOpen) { setQuery(""); setAct(0); setTimeout(() => input.current?.focus(), 30); }
  }, [searchOpen]);
  useEffect(() => setAct(0), [query]);

  const go = (href: string) => { close(); router.push(href); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAct((a) => Math.min(a + 1, Math.max(found.length - 1, 0))); }
    if (e.key === "ArrowUp") { e.preventDefault(); setAct((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter") {
      if (found[act]) go(productHref(found[act]));
      else if (query.trim()) go(`/services?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className={`cmdk ${searchOpen ? "on" : ""}`} role="dialog" aria-label="جست‌وجو" aria-hidden={!searchOpen}>
      <div className="ask" style={{ width: "100%" }}>
        <label>
          <Icon id="search" style={{ color: "var(--gray-d)", width: 22, height: 22 }} />
          <input ref={input} type="search" placeholder="نام سرویس، به فارسی یا انگلیسی…" autoComplete="off" value={query}
            onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey}
            role="combobox" aria-expanded={found.length > 0} aria-controls="cmdk-res" aria-activedescendant={found[act] ? `cmdk-${found[act].id}` : undefined} />
        </label>
      </div>
      <div className="res" id="cmdk-res" role="listbox">
        {!query.trim() ? (
          <div className="cmdk-cats">
            <small className="muted">دسته‌ها</small>
            <div>{(Object.keys(CATEGORIES) as Category[]).filter((k) => k !== ("all" as string)).map((k) => (
              <button key={k} type="button" onClick={() => go(`/services?c=${k}`)}>{CATEGORIES[k]} <sup>{fa(countIn(k))}</sup></button>
            ))}</div>
            <small className="muted">برای چه کاری؟</small>
            <div>{liveTasks().slice(0, 8).map((t) => (
              <button key={t.id} type="button" onClick={() => go(`/finder?t=${t.id}`)}>{t.label}</button>
            ))}</div>
          </div>
        ) : found.length ? found.map((p, i) => (
          <Link key={p.id} id={`cmdk-${p.id}`} role="option" aria-selected={i === act} className={i === act ? "act" : ""} href={productHref(p)}
            onClick={close} onMouseEnter={() => setAct(i)}>
            <span className="mono"><BrandLogo id={p.id} size={22} /></span>
            <span><b className="en" style={{ display: "block", fontWeight: 400 }}>{p.name}</b><small className="muted">{p.description}</small></span>
            <span className="p num">از {money(minPrice(p))}</span>
          </Link>
        )) : (
          <div className="none">«{query}» را هنوز نداریم. <Link className="link" href={`/finder?q=${encodeURIComponent(query)}`} onClick={close}>در ابزاریاب بپرس</Link> یا <Link className="link" href={`/account/tickets/new?topic=request&q=${encodeURIComponent(query)}`} onClick={close}>درخواستش را بده</Link></div>
        )}
      </div>
    </div>
  );
}
