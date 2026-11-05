"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./brand";

/**
 * A horizontal row of cards that is easy to move through:
 * - previous / next buttons (desktop) that page by one screen and hide at the ends,
 * - drag with the mouse (a drag never opens the card under the pointer),
 * - a fade only on the side that still has more cards.
 * Touch keeps the native swipe with snap. Works in RTL, where scrollLeft runs from 0 to negative.
 */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const at = Math.abs(el.scrollLeft);
    setEdge({ start: at < 4, end: at >= max - 4 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const step = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: rtl ? -step : step, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <div className={`rail ${edge.start ? "at-start" : ""} ${edge.end ? "at-end" : ""}`} role="group" aria-label={label}>
      <button type="button" className="rail-btn prev" onClick={() => page(-1)} disabled={edge.start} aria-label="قبلی" tabIndex={edge.start ? -1 : 0}>
        <Icon id="arrow" />
      </button>
      <div
        ref={track}
        className="cat-scroll"
        onScroll={measure}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button !== 0) return;
          drag.current = { x: e.clientX, left: track.current!.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current, el = track.current;
          if (!d || !el) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) < 6) return;
          if (!d.moved) { d.moved = true; el.classList.add("dragging"); el.setPointerCapture(e.pointerId); }
          el.scrollLeft = d.left - dx;
        }}
        onPointerUp={(e) => {
          const el = track.current;
          if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
          el?.classList.remove("dragging");
          // Keep `moved` until the click that follows this pointerup has been swallowed.
          setTimeout(() => { drag.current = null; }, 0);
        }}
        onPointerCancel={() => { track.current?.classList.remove("dragging"); drag.current = null; }}
        onClickCapture={(e) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); } }}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
      <button type="button" className="rail-btn next" onClick={() => page(1)} disabled={edge.end} aria-label="بعدی" tabIndex={edge.end ? -1 : 0}>
        <Icon id="arrow" />
      </button>
    </div>
  );
}
