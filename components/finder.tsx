"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { minPrice, type Product } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { whenShort } from "@/lib/facts";
import { budgetPick, liveTasks, matchTasks, picksOf, type Task } from "@/lib/finder";
import { money } from "@/lib/format";
import { BrandLogo, Icon } from "./brand";

const EXAMPLES = ["می‌خوام برای پیجم ریلز بسازم", "کدنویسی پایتون", "پایان‌نامه‌ام رو بنویسم", "یه سایت فروشگاهی بدون کد", "ارائه کلاس فردا", "آیلتس بخونم"];

export function TaskGlyph({ t, size = 22 }: { t: Task; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={t.glyph} />
    </svg>
  );
}

/** «ابزاریاب»: pick or type what you want to do, get the right tools from the catalog. */
export function Finder() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const tasks = liveTasks();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sel, setSel] = useState<string | null>(params.get("t"));
  const [ex, setEx] = useState(0);
  const result = useRef<HTMLDivElement>(null);

  // The placeholder cycles through real examples so people know they can just say it.
  useEffect(() => {
    const id = setInterval(() => setEx((i) => (i + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(id);
  }, []);

  const match = useMemo(() => matchTasks(q), [q]);
  const task = tasks.find((t) => t.id === sel) ?? (q.trim() ? match.tasks[0] : undefined);
  const also = q.trim() ? match.tasks.filter((t) => t.id !== task?.id).slice(0, 3) : [];

  const sync = (t: string | null, text: string) => {
    const u = new URLSearchParams();
    if (t) u.set("t", t);
    if (text.trim()) u.set("q", text.trim());
    router.replace(u.size ? `${path}?${u}` : path, { scroll: false });
  };
  const choose = (t: Task) => {
    const next = sel === t.id ? null : t.id;
    setSel(next); setQ("");
    sync(next, "");
    if (next) requestAnimationFrame(() => result.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const type = (v: string) => { setQ(v); setSel(null); };

  return (
    <div className="fd">
      <form className="fd-ask" role="search" onSubmit={(e) => { e.preventDefault(); sync(null, q); result.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
        <span className="fd-spark" aria-hidden><i /><i /><i /></span>
        <label className="sr" htmlFor="fd-q">چه کاری می‌خواهی انجام بدهی؟</label>
        <input id="fd-q" value={q} onChange={(e) => type(e.target.value)} autoComplete="off" enterKeyHint="search"
          placeholder={`مثلاً: ${EXAMPLES[ex]}`} />
        {q && <button type="button" className="fd-x" aria-label="پاک کردن" onClick={() => { type(""); sync(null, ""); }}>×</button>}
        <button type="submit" className="fd-go" aria-label="پیدا کن"><Icon id="arrow" /></button>
      </form>

      <div className="fd-tasks" role="list">
        {tasks.map((t) => (
          <button key={t.id} type="button" role="listitem" aria-pressed={task?.id === t.id}
            className={`fd-task ${task?.id === t.id ? "on" : ""}`} style={{ "--t": t.tone } as React.CSSProperties} onClick={() => choose(t)}>
            <span className="fd-g"><TaskGlyph t={t} /></span>
            <b>{t.label}</b>
            <small>{t.line}</small>
          </button>
        ))}
      </div>

      <div ref={result} className="fd-out" aria-live="polite">
        {task ? <Picks t={task} key={task.id} /> : q.trim() ? (
          match.products.length ? (
            <div className="fd-none">
              <p>برای «{q}» دسته مشخصی پیدا نکردیم، ولی این‌ها به حرفت نزدیک‌اند:</p>
              <div className="fd-alts">{match.products.map((p) => <Alt key={p.id} p={p} why={p.use} />)}</div>
            </div>
          ) : (
            <div className="fd-none">
              <p>برای «{q}» هنوز پیشنهادی نداریم. یکی از کارهای بالا را انتخاب کن یا از پشتیبانی بپرس؛ اگر ابزارش را بخواهی برایت می‌آوریم.</p>
              <Link className="btn btn-ghost" href={`/account/tickets/new?topic=request&q=${encodeURIComponent(q)}`}>درخواست ابزار</Link>
            </div>
          )
        ) : (
          <p className="fd-hint">یکی از کارها را انتخاب کن یا با زبان خودت بنویس چه می‌خواهی.</p>
        )}
        {also.length > 0 && (
          <div className="fd-also">
            <small>شاید منظورت این بود:</small>
            {also.map((t) => <button key={t.id} type="button" onClick={() => choose(t)} style={{ "--t": t.tone } as React.CSSProperties}><TaskGlyph t={t} size={16} />{t.label}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Picks({ t }: { t: Task }) {
  const list = picksOf(t);
  const cheap = budgetPick(list);
  const [best, ...rest] = list;
  return (
    <section className="fd-res" style={{ "--t": t.tone } as React.CSSProperties} aria-label={`پیشنهاد برای ${t.label}`}>
      <header className="fd-res-h"><span className="fd-g"><TaskGlyph t={t} size={18} /></span><span>برای <b>{t.label}</b></span></header>
      <Link href={productHref(best.p)} className="fd-best">
        <span className="fd-tag">بهترین انتخاب</span>
        <span className="fd-best-logo"><BrandLogo id={best.p.id} size={44} /></span>
        <span className="fd-best-t">
          <b className="en">{best.p.name}</b>
          <span>{best.why}</span>
        </span>
        <span className="fd-best-f">
          <span><small>از</small> <b className="num">{money(minPrice(best.p))}</b> <small>تومان</small></span>
          <small>{whenShort(best.p)}</small>
          <span className="fd-cta">مشاهده و خرید <Icon id="arrow" className="arrow" /></span>
        </span>
      </Link>
      {rest.length > 0 && <div className="fd-alts">{rest.map((x) => <Alt key={x.p.id} p={x.p} why={x.why} cheap={x.p.id === cheap} />)}</div>}
    </section>
  );
}

function Alt({ p, why, cheap }: { p: Product; why: string; cheap?: boolean }) {
  return (
    <Link href={productHref(p)} className="fd-alt">
      <span className="mono"><BrandLogo id={p.id} size={24} /></span>
      <span className="fd-alt-t">
        <b className="en">{p.name}</b>{cheap && <em>اقتصادی</em>}
        <small>{why}</small>
      </span>
      <span className="fd-alt-p num">از {money(minPrice(p))}</span>
    </Link>
  );
}
