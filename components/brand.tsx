import { BRAND_SPRITE } from "@/lib/sprite";
import { LOGOS } from "@/lib/logos";
import { ALL_PRODUCTS } from "@/lib/catalog";
import type { CSSProperties } from "react";

/** Inline SVG symbols for the logo (#wm = Persian wordmark, #ig = «پ» glyph) and UI icons. Render once in the layout. */
export function Sprites() {
  return (
    <>
      <span style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: BRAND_SPRITE }} />
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></symbol>
        <symbol id="i-bag" viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></symbol>
        <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></symbol>
        <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M19 12H5m6-6-6 6 6 6" /></symbol>
        <symbol id="i-back" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></symbol>
        <symbol id="i-grid" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></symbol>
        <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></symbol>
        <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7" /></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></symbol>
        <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4V5Z" /></symbol>
        <symbol id="i-box" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></symbol>
      </svg>
    </>
  );
}

export function Wordmark({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <svg className={`wm ${className}`} style={style} aria-hidden="true"><use href="#wm" /></svg>;
}

export function Glyph({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <svg className={`ig ${className}`} style={style} aria-hidden="true"><use href="#ig" /></svg>;
}

export function Icon({ id, className = "", style }: { id: string; className?: string; style?: CSSProperties }) {
  return <svg className={`i ${className}`} style={style} aria-hidden="true"><use href={`#i-${id}`} /></svg>;
}

/** The brand signature: the three drop-dots of «پ». */
export function Dots({ size = 5, color }: { size?: number; color?: string }) {
  const style = { "--d": `${size}px`, ...(color ? { "--c": color } : {}) } as CSSProperties;
  return <span className="dots" style={style} aria-hidden="true"><i /><i /><i /></span>;
}

export function Eyebrow({ children, dotColor, start = true }: { children: string; dotColor?: string; start?: boolean }) {
  return (
    <div className="eyebrow" style={start ? { justifyContent: "flex-start", direction: "rtl" } : undefined}>
      <Dots color={dotColor} />
      <span className={/[\u0600-\u06FF]/.test(children) ? "fa" : "en"}>{children}</span>
    </div>
  );
}

/** Official mark of a tool we sell, single-colour (inherits currentColor). */
export function BrandLogo({ id, size = 24, className = "", label }: { id: string; size?: number; className?: string; label?: string }) {
  const d = LOGOS[id];
  if (!d) {
    const mono = ALL_PRODUCTS.find((p) => p.id === id)?.monogram ?? id.slice(0, 2).toUpperCase();
    return <span className={`blogo blogo-m en ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden={label ? undefined : true} aria-label={label}>{mono}</span>;
  }
  return (
    <svg className={`blogo ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd"
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={d} />
    </svg>
  );
}
