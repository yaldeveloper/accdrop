"use client";
import { useEffect, useState } from "react";

/** Sticky in-page table of contents that highlights the section in view. */
export function Toc({ items }: { items: [string, string][] }) {
  const [active, setActive] = useState(items[0]?.[0]);
  useEffect(() => {
    const els = items.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-130px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);
  useEffect(() => {
    const a = document.querySelector<HTMLElement>(`.p2-nav a[href="#${active}"]`);
    const bar = a?.parentElement;
    if (a && bar && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: a.offsetLeft - bar.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" });
  }, [active]);
  return (
    <nav className="p2-nav" aria-label="فهرست مطالب">
      <div className="wrap">
        {items.map(([id, label]) => (
          <a key={id} href={`#${id}`} className={active === id ? "on" : undefined} aria-current={active === id ? "location" : undefined}>{label}</a>
        ))}
      </div>
    </nav>
  );
}
