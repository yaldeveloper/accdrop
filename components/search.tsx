"use client";

import { useEffect, useRef, useState } from "react";
import { minPrice, PRODUCTS } from "@/lib/catalog";
import { money } from "@/lib/format";
import { Icon } from "./brand";
import { useStore } from "./store";

function Results({ query }: { query: string }) {
  const { openProduct } = useStore();
  const q = query.trim().toLowerCase();
  const found = PRODUCTS.filter((p) => !q || `${p.name} ${p.maker} ${p.id} ${p.description}`.toLowerCase().includes(q));
  if (!found.length)
    return <div className="none">در مجموعه ما نیست. <a className="link" href="#concierge">درخواستش را بده</a></div>;
  return (
    <>
      {found.slice(0, 6).map((p, i) => (
        <button key={p.id} className={i ? "" : "act"} onClick={() => openProduct(p.id)}>
          <span className="mono">{p.monogram}</span>
          <span><b className="en" style={{ display: "block", fontWeight: 400 }}>{p.name}</b><small className="muted">{p.description}</small></span>
          <span className="p num">از {money(minPrice(p))}</span>
        </button>
      ))}
    </>
  );
}

function useSearch() {
  const [query, setQuery] = useState("");
  const { openProduct } = useStore();
  const onEnter = () => {
    const q = query.trim().toLowerCase();
    const hit = PRODUCTS.find((p) => !q || `${p.name} ${p.maker} ${p.id} ${p.description}`.toLowerCase().includes(q));
    if (hit) openProduct(hit.id);
  };
  return { query, setQuery, onEnter };
}

export function SearchDialog() {
  const { searchOpen } = useStore();
  const { query, setQuery, onEnter } = useSearch();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchOpen) { setQuery(""); setTimeout(() => input.current?.focus(), 60); }
  }, [searchOpen, setQuery]);
  return (
    <div className={`cmdk ${searchOpen ? "on" : ""}`} role="dialog" aria-label="جست‌وجو" aria-hidden={!searchOpen}>
      <div className="ask" style={{ width: "100%" }}>
        <label>
          <Icon id="search" style={{ color: "var(--gray-d)", width: 22, height: 22 }} />
          <input ref={input} type="search" placeholder="نام ابزار…" autoComplete="off" value={query}
            onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onEnter()} />
        </label>
      </div>
      <div className="res"><Results query={query} /></div>
    </div>
  );
}
