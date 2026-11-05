"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * One category's cards.
 * - Desktop: one tidy row of the first four (three on small laptops), no sideways scrolling; the row header's «همه N» opens the rest.
 * - Phones: the browser's own swipe with snap, and a fade only on the side that still has more cards.
 * No scroll hijacking, no custom drag: the page scrolls exactly as the visitor expects.
 */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

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
    <div className={`rail ${edge.start ? "at-start" : ""} ${edge.end ? "at-end" : ""}`} role="group" aria-label={label}>
      <div ref={track} className="cat-scroll" onScroll={measure}>{children}</div>
    </div>
  );
}
