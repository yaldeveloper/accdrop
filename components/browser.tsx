"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, listed, type Category } from "@/lib/catalog";
import { CAT_LINE, CAT_TONE, inCat } from "./mega";
import { browse, countIn, NEEDS, SORTS, type SortKey } from "@/lib/search";
import { fa } from "@/lib/format";
import { BrandLogo, Icon } from "./brand";
import { ToolCard } from "./sections";

const CATS = Object.keys(CATEGORIES) as ("all" | Category)[];
const isCat = (v: string | null): v is "all" | Category => !!v && v in CATEGORIES;

/** Search, categories, needs and sort over the whole catalog. */
export function ServiceBrowser({ syncUrl = false }: { syncUrl?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [cat, setCat] = useState<"all" | Category>(() => (syncUrl && isCat(params.get("c")) ? (params.get("c") as Category) : "all"));
  const [query, setQuery] = useState(() => (syncUrl ? params.get("q") ?? "" : ""));
  const [need, setNeed] = useState<string | undefined>(() => (syncUrl ? params.get("need") ?? undefined : undefined));
  const [sort, setSort] = useState<SortKey>("featured");
  const instant = false;
  const input = useRef<HTMLInputElement>(null);

  const list = useMemo(() => browse({ cat, query, sort, instant, need }), [cat, query, sort, instant, need]);
  const filtered = cat !== "all" || !!query.trim() || instant || !!need;

  // Keep the address shareable on the services page (?c=ai&q=…), without adding history entries.
  useEffect(() => {
    if (!syncUrl) return;
    const sp = new URLSearchParams();
    if (cat !== "all") sp.set("c", cat);
    if (query.trim()) sp.set("q", query.trim());
    if (need) sp.set("need", need);
    const next = sp.size ? `${path}?${sp}` : path;
    router.replace(next, { scroll: false });
  }, [syncUrl, cat, query, need, path, router]);

  const reset = () => { setCat("all"); setQuery(""); setNeed(undefined); setSort("featured"); input.current?.focus(); };

  return (
    <div className="sb">
      <div className="sb-bar">
        <label className="sb-q">
          <Icon id="search" />
          <input ref={input} type="search" value={query} onChange={(e) => { setQuery(e.target.value); setNeed(undefined); }}
            placeholder="نام سرویس یا کاری که می‌خواهی…" aria-label="جست‌وجوی سرویس" />
          {query && <button type="button" className="sb-x" onClick={() => { setQuery(""); input.current?.focus(); }} aria-label="پاک کردن">×</button>}
        </label>
        <div className="sb-tools">
          <div className="sb-sort" role="radiogroup" aria-label="مرتب‌سازی">
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={sort === k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>{SORTS[k]}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="cat-rail" role="tablist" aria-label="دسته‌بندی">
        {CATS.map((k) => {
          const logos = (k === "all" ? listed() : inCat(k)).slice(0, 4);
          return (
            <button key={k} className={`cat-c ${k === cat ? "on" : ""}`} style={{ "--t": k === "all" ? "#B9FF63" : CAT_TONE[k] } as CSSProperties}
              onClick={() => { setCat(k); setNeed(undefined); }} role="tab" aria-selected={k === cat}>
              <span className="cat-logos">{logos.map((p) => <span key={p.id}><BrandLogo id={p.id} size={14} /></span>)}</span>
              <b>{k === "all" ? "همه سرویس‌ها" : CATEGORIES[k]}</b>
              <small><span className="num">{fa(countIn(k))}</span> سرویس</small>
            </button>
          );
        })}
      </div>

      <div className="sb-needs">
        <span className="muted">برای چه کاری؟</span>
        {NEEDS.map((n) => (
          <button key={n.label} type="button" className={need === n.label ? "on" : ""} aria-pressed={need === n.label}
            onClick={() => { setNeed(need === n.label ? undefined : n.label); setCat("all"); setQuery(""); }}>{n.label}</button>
        ))}
      </div>

      <div className="sb-meta" aria-live="polite">
        <span>{list.length ? <><b className="num">{fa(list.length)}</b> سرویس</> : "چیزی پیدا نشد"}</span>
        {filtered && <button type="button" className="link" onClick={reset}>پاک کردن فیلترها</button>}
      </div>

      {!filtered && sort === "featured" ? (
        <div className="cat-rows">
          {CATS.filter((k): k is Category => k !== "all").map((k) => {
            const items = inCat(k);
            if (!items.length) return null;
            return (
              <section key={k} className="cat-row" style={{ "--t": CAT_TONE[k] } as CSSProperties}>
                <header><i /><h3>{CATEGORIES[k]}</h3><small className="muted">{CAT_LINE[k]}</small>
                  <button type="button" className="link" onClick={() => { setCat(k); window.scrollTo({ top: (input.current?.getBoundingClientRect().top ?? 0) + scrollY - 120, behavior: "smooth" }); }}>همه {fa(items.length)} <Icon id="arrow" className="arrow" /></button>
                </header>
                <div className="cat-scroll">{items.map((p) => <ToolCard key={p.id} p={p} />)}</div>
              </section>
            );
          })}
        </div>
      ) : list.length ? (
        <div className="tiles">{list.map((p) => <ToolCard key={p.id} p={p} />)}</div>
      ) : (
        <div className="sb-empty">
          <b>«{query || "این ترکیب"}» را هنوز نداریم.</b>
          <p className="muted">بگو چه سرویسی لازم داری؛ اگر بشود، اضافه‌اش می‌کنیم و خبرت می‌کنیم.</p>
          <Link className="btn btn-ink" href={`/account/tickets/new?topic=request&q=${encodeURIComponent(query)}`}>درخواست سرویس <Icon id="arrow" className="arrow" /></Link>
        </div>
      )}
    </div>
  );
}
