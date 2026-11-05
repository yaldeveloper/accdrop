"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { fa } from "@/lib/format";
import { Icon } from "./brand";

/** Cards shown per category before «نمایش همه» on desktop (two rows of four). */
const FIRST = 8;

/**
 * One category's cards.
 * - Desktop: a plain grid, no sideways scrolling. Long categories show two rows and a «نمایش همه» button.
 * - Phones: the browser's own swipe with snap, and a fade only on the side that still has more cards.
 * No scroll hijacking, no custom drag: the page scrolls exactly as the visitor expects.
 */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const [open, setOpen] = useState(false);
  const count = Children.count(children);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const at = Math.abs(el.scrollLeft); // RTL: scrollLeft runs from 0 to negative
    setEdge({ start: at < 4, end: max <= 4 || at >= max - 4 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div className={`rail ${edge.start ? "at-start" : ""} ${edge.end ? "at-end" : ""} ${open ? "open" : ""}`} role="group" aria-label={label}>
      <div ref={track} className="cat-scroll" onScroll={measure}>{children}</div>
      {count > FIRST && (
        <button type="button" className="rail-more" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "نمایش کمتر" : <>نمایش همه <span className="num">{fa(count)}</span> سرویس</>}
          <Icon id="arrow" />
        </button>
      )}
    </div>
  );
}
