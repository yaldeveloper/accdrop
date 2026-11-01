"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { productHref } from "@/lib/content";
import { minPrice, PRODUCTS } from "@/lib/catalog";
import { money } from "@/lib/format";
import { Icon } from "./brand";
import { useStore } from "./store";

function Results({ query }: { query: string }) {
  const { close } = useStore();
  const q = query.trim().toLowerCase();
  const found = PRODUCTS.filter((p) => !q || `${p.name} ${p.maker} ${p.id} ${p.description}`.toLowerCase().includes(q));
  if (!found.length)
    return <div className="none">در مجموعه ما نیست. <a className="link" href="#concierge">درخواستش را بده</a></div>;
  return (
    <>
      {found.slice(0, 6).map((p, i) => (
        <Link key={p.id} className={i ? "" : "act"} href={productHref(p)} onClick={close}>
          <span className="mono">{p.monogram}</span>
          <span><b className="en" style={{ display: "block", fontWeight: 400 }}>{p.name}</b><small className="muted">{p.description}</small></span>
          <span className="p num">از {money(minPrice(p))}</span>
        </Link>
      ))}
    </>
  );
}

function useSearch() {
  const [query, setQuery] = useState("");
  const { close } = useStore();
  const router = useRouter();
  const onEnter = () => {
    const q = query.trim().toLowerCase();
    const hit = PRODUCTS.find((p) => !q || `${p.name} ${p.maker} ${p.id} ${p.description}`.toLowerCase().includes(q));
    if (hit) { close(); router.push(productHref(hit)); }
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
