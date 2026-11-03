"use client";

import type React from "react";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, CURRENT_DROP, DELIVERY, DROPS, PRODUCTS, dropOf, listed, tiersLabel, variantsOf, minPrice, optionLabel, productById, type Category, type Product } from "@/lib/catalog";
import { duration, fa, money, pad2 } from "@/lib/format";
import { BrandLogo, Dots, Eyebrow, Glyph, Icon, Wordmark } from "./brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { productHref } from "@/lib/content";
import { splitName } from "./pass";
import { useStore } from "./store";
import { useAccount } from "./account";
import { ServiceBrowser } from "./browser";
import { MegaMenu, MobileMenu } from "./mega";
import { openChat } from "./chat";
import { searchProducts } from "@/lib/search";
import { themeOf } from "@/lib/theme";

/** Fades sections in on scroll. */
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function Header() {
  const { cart, openSearch, setView } = useStore();
  const { user } = useAccount();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 20);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`hd ${scrolled ? "s" : ""}`}>
      <div className="wrap">
        <a href="/" aria-label="اک‌دراپ، صفحه اصلی"><Wordmark /></a>
        <nav aria-label="منوی اصلی">
          <MegaMenu /><Link href="/group">خرید گروهی</Link><Link href="/#drop">دراپ‌ها</Link><Link href="/blog">بلاگ</Link><Link href="/guarantee">ضمانت</Link><Link href="/contact">پشتیبانی</Link>
        </nav>
        <div className="sp" />
        <div className="tools">
          <button onClick={openSearch} aria-label="جست‌وجو"><Icon id="search" /><span className="tx">جست‌وجو</span></button>
          <Link href={user ? "/account" : "/login"} aria-label={user ? "داشبورد" : "ورود"}><Icon id="user" /><span className="tx">{user ? (user.name.split(" ")[0] || "حساب من") : "ورود / ثبت‌نام"}</span></Link>
          <button onClick={() => setView("cart")} aria-label="سبد خرید"><Icon id="bag" /><span className="num">({fa(cart.length)})</span></button>
          <button className="hd-burger" onClick={() => setMenu(true)} aria-label="منو" aria-expanded={menu}><span /><span /><span /></button>
        </div>
      </div>
      <MobileMenu open={menu} onClose={closeMenu} onSearch={openSearch} onChat={openChat} />
    </header>
  );
}

/** One product card: brand mark, name, what it is for, starting price. */
export function ToolCard({ p }: { p: Product }) {
  const d = dropOf(p.id);
  const tiers = tiersLabel(p);
  const [tool, tier] = splitName(p.name);
  return (
    <Link className="tile" href={productHref(p)}>
      <span className="tile-top">
        <span className="tile-logo"><BrandLogo id={p.id} size={26} /></span>
        {d ? <span className="tile-drop">{fa(Math.round((1 - d.price / d.was) * 100))}٪ تخفیف</span>
          : p.badge ? <span className="tile-drop tile-badge">{p.badge}</span> : null}
      </span>
      <b className="en tile-tool">{tiers ? tool : <>{tool}{tier && <small> {tier}</small>}</>}</b>
      <span className="tile-use">{tiers ? <span className="en tile-tiers">{tiers}</span> : p.use}</span>
      {p.group?.length ? <span className="tile-grp">خرید گروهی</span> : null}
      <span className="tile-foot">
        <span>از <b className="num">{money(Math.min(d?.price ?? Infinity, ...variantsOf(p).map(minPrice)))}</b> تومان</span>
        <Icon id="arrow" className="arrow" style={{ width: 16, height: 16 }} />
      </span>
    </Link>
  );
}

const FEATURED = ["chatgpt", "claude", "cursor", "adobe", "tgpremium", "applegift"];
const CHIP: Record<string, string> = { adobe: "Adobe", tgpremium: "Telegram", applegift: "Gift Card" };
/** Inner ring first, then outer ring; also the auto-cycle order. */
const INNER = ["chatgpt", "claude", "gemini", "cursor", "adobe", "canva"];
const OUTER = ["tgpremium", "perplexity", "applegift", "grok", "linkedin", "copilot", "duolingo", "capcut", "appleid", "kling", "notion", "vnumber"];
const ORBIT = [...INNER, ...OUTER];

const fromPrice = (p: Product) => Math.min(dropOf(p.id)?.price ?? Infinity, minPrice(p));

/** Every tool on two slow, counter-rotating rings; the selected one sits in the centre. */
function Orbit({ active, onPick, onHover }: { active: string; onPick: (id: string) => void; onHover: (v: boolean) => void }) {
  const p = productById(active);
  const [tool, tier] = splitName(p.name);
  const ring = (ids: string[], cls: string) => (
    <div className={`orb-ring ${cls}`}>
      {ids.map((id, i) => (
        <button key={id} className={`orb-i ${id === active ? "on" : ""}`} style={{ "--a": `${(360 / ids.length) * i}deg` } as React.CSSProperties}
          onClick={() => onPick(id)} aria-label={productById(id).name} aria-pressed={id === active}>
          <span><BrandLogo id={id} size={cls === "in" ? 24 : 22} /></span>
        </button>
      ))}
    </div>
  );
  return (
    <div className="orbit" onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      <div className="orb-glow" aria-hidden />
      {ring(OUTER, "out")}
      {ring(INNER, "in")}
      <Link className="orb-core" href={productHref(p)} key={active}>
        <span className="orb-logo"><BrandLogo id={p.id} size={34} /></span>
        <b className="en">{tool}{tier && <i> {tier}</i>}</b>
        <small>از <span className="num">{money(fromPrice(p))}</span> تومان</small>
      </Link>
      <span className="orb-count"><b>{fa(PRODUCTS.length)}</b> سرویس، یک فروشگاه</span>
    </div>
  );
}

export function Hero() {
  const [active, setActive] = useState(ORBIT[0]);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((a) => ORBIT[(ORBIT.indexOf(a) + 1) % ORBIT.length]), 3000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section className="hero2">
      <div className="wrap hero2-g">
        <div className="hero2-copy">
          <Eyebrow>{`${fa(PRODUCTS.length)} سرویس، یک فروشگاه`}</Eyebrow>
          <h1>هر اشتراکی که لازم داری،<br /><b>با تومان.</b></h1>
          <p className="lead">هوش مصنوعی، طراحی، تلگرام، اپل و بیشتر؛ روی ایمیل یا آیدی خودت، با ضمانت بازگشت وجه.</p>
          <HeroSearch />
          <div className="pick" aria-label="پرطرفدارها">
            <span className="muted">پرطرفدار:</span>
            {FEATURED.map((id) => (
              <Link key={id} className="en" href={productHref(productById(id))} onMouseEnter={() => { setActive(id); setPaused(true); }} onMouseLeave={() => setPaused(false)}>
                <BrandLogo id={id} size={15} />{CHIP[id] ?? splitName(productById(id).name)[0]}
              </Link>
            ))}
          </div>
        </div>
        <Orbit active={active} onPick={(id) => { setActive(id); setPaused(true); }} onHover={setPaused} />
      </div>
      <div className="wrap">
        <ul className="assure-row">
          <li><Dots size={3} />فقط ایمیل یا آیدی، هرگز رمز عبور</li>
          <li><Dots size={3} /><Link href="/guarantee">ضمانت بازگشت وجه</Link></li>
          <li><Dots size={3} />پرداخت با همه کارت‌های بانکی</li>
          <li><Dots size={3} />پشتیبانی فارسی و چت آنلاین</li>
        </ul>
      </div>
    </section>
  );
}

/** The hero's search: suggestions as you type, Enter opens the best match or the full list. */
function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const found = q.trim() ? searchProducts(q).slice(0, 5) : [];
  const go = () => {
    if (found[act]) router.push(productHref(found[act]));
    else router.push(q.trim() ? `/services?q=${encodeURIComponent(q.trim())}` : "/services");
  };
  return (
    <form className="hs" role="search" onSubmit={(e) => { e.preventDefault(); go(); }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <label className="hs-in">
        <Icon id="search" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setAct(0); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setAct((a) => Math.min(a + 1, found.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setAct((a) => Math.max(a - 1, 0)); } if (e.key === "Escape") setOpen(false); }}
          placeholder="دنبال چه سرویسی هستی؟ مثلاً ChatGPT یا فتوشاپ" aria-label="جست‌وجوی سرویس" autoComplete="off"
          role="combobox" aria-expanded={open && found.length > 0} aria-controls="hs-list" />
        <button className="btn btn-paper" type="submit">جست‌وجو</button>
      </label>
      {open && found.length > 0 && (
        <ul className="hs-list" id="hs-list" role="listbox">
          {found.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === act}>
              <Link href={productHref(p)} className={i === act ? "act" : ""} onMouseEnter={() => setAct(i)}>
                <span className="mono"><BrandLogo id={p.id} size={20} /></span>
                <span><b className="en">{p.name}</b><small className="muted">{p.description}</small></span>
                <span className="num muted">از {money(fromPrice(p))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

export function Steps() {
  const steps: [string, string][] = [
    ["انتخاب کن", "ابزار و مدت اشتراک"],
    ["با تومان بپرداز", "درگاه بانکی، بدون ارز"],
    ["استفاده کن", "روی ایمیل خودت، چند دقیقه بعد"],
  ];
  return (
    <section className="steps3">
      <div className="wrap">
        <ol>
          {steps.map(([t, d], i) => (
            <li key={t} className="reveal"><span className="en n">0{i + 1}</span><b>{t}</b><span className="muted">{d}</span></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Collection() {
  return (
    <section className="light" id="collection">
      <div className="wrap">
        <div className="head reveal">
          <div>
            <Eyebrow dotColor="var(--ink)">همه سرویس‌ها</Eyebrow>
            <h2>به چه چیزی<br /><b>نیاز داری؟</b></h2>
          </div>
          <p className="muted">اسمش را بنویس، دسته را انتخاب کن، یا بگو برای چه کاری می‌خواهی‌اش.</p>
        </div>
        <Suspense fallback={<div className="sb-wait" />}><ServiceBrowser /></Suspense>
      </div>
    </section>
  );
}

function useCountdownToMidnight() {
  const [left, setLeft] = useState<[number, number, number] | null>(null);
  useEffect(() => {
    const tick = () => {
      const n = new Date(), e = new Date(n);
      e.setHours(24, 0, 0, 0);
      const s = Math.floor((+e - +n) / 1000);
      setLeft([Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

export function DropSection() {
  const { notify } = useStore();
  const left = useCountdownToMidnight();
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const go = (i: number) => {
    const el = track.current, n = DROPS.length;
    if (!el) return;
    const k = (i + n) % n;
    const card = el.children[k] as HTMLElement | undefined;
    card?.scrollIntoView({ inline: "center", block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setAt(Number((e.target as HTMLElement).dataset.i)); }), { root: el, threshold: 0.6 });
    Array.from(el.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);
  return (
    <section className="drop" id="drop">
      <div className="wrap">
        <div className="drops-h reveal">
          <div>
            <Eyebrow>دراپ‌های این هفته</Eyebrow>
            <h2>قیمت ویژه، <b>ظرفیت محدود.</b></h2>
          </div>
          <div className="drops-clock" aria-label="زمان باقی‌مانده">
            <small>تا پایان امشب</small>
            <div>{(["ساعت", "دقیقه", "ثانیه"] as const).map((u, i) => <span key={u}><b className="num">{left ? pad2(left[i]) : "--"}</b><i>{u}</i></span>)}</div>
          </div>
        </div>
        <div className="drops" ref={track} aria-roledescription="اسلایدر" aria-label="دراپ‌ها">
          {DROPS.map((d, i) => {
            const p = productById(d.productId);
            return (
              <article key={d.number} className={`dropc ${i === at ? "on" : ""}`} data-i={i} style={{ "--b": themeOf(p.id).c } as React.CSSProperties} aria-label={`دراپ ${fa(d.number)}: ${p.name}`}>
                <div className="dropc-top"><span className="mono"><BrandLogo id={p.id} size={26} /></span><span className="tag">№{fa(String(d.number).padStart(2, "0"))}</span></div>
                <h3 className="en">{p.name}</h3>
                <div className="sub">{optionLabel(p, d.plan)} · {DELIVERY[d.type].title}</div>
                <div className="price"><b className="num">{money(d.price)}</b><small>تومان</small><s className="num">{money(d.was)}</s><em className="num">{fa(Math.round((1 - d.price / d.was) * 100))}٪</em></div>
                <div className="stock"><span>فقط <b>{fa(d.left)}</b> از {fa(d.of)} باقی مانده</span></div>
                <div className="meter"><i style={{ width: `${(d.left / d.of) * 100}%` }} /></div>
                <Link className="btn btn-paper btn-block" href={`${productHref(p)}?plan=${d.plan}&type=${d.type}`}>بگیرش <Icon id="arrow" className="arrow" /></Link>
              </article>
            );
          })}
        </div>
        <div className="drops-nav">
          <button type="button" onClick={() => go(at - 1)} aria-label="قبلی">‹</button>
          <div className="drops-dots">{DROPS.map((d, i) => <button key={d.number} className={i === at ? "on" : ""} onClick={() => go(i)} aria-label={`دراپ ${fa(i + 1)}`} />)}</div>
          <button type="button" onClick={() => go(at + 1)} aria-label="بعدی">›</button>
        </div>
        <div className="next reveal">
          <div>
            <b style={{ fontWeight: 500 }}>دراپ‌های بعدی · پنجشنبه، ساعت ۲۰:۰۰</b>
            <div className="muted" style={{ fontSize: 13, fontWeight: 300 }}>زودتر از همه خبردار شو.</div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); notify("ثبت شد. خبرت می‌کنیم."); }}>
            <input type="tel" inputMode="numeric" placeholder="شماره موبایل" aria-label="شماره موبایل" required />
            <button>ثبت</button>
          </form>
        </div>
      </div>
    </section>
  );
}

export function Shield() {
  const [tracked, setTracked] = useState<string | null>(null);
  const router = useRouter();
  const promises: [string, string][] = [
    ["قطع شد؟ جایگزین می‌کنیم.", "تا روز آخر اشتراک. اگر نشد، پول روزهای باقی‌مانده برمی‌گردد."],
    ["فقط ایمیل، نه رمز.", "اشتراک روی اکانت خودت فعال می‌شود."],
    ["همه‌چیز را می‌بینی.", "از پرداخت تا فعال‌سازی، قدم‌به‌قدم."],
  ];
  return (
    <section className="light" id="shield">
      <div className="wrap shield-g">
        <div className="reveal">
          <Eyebrow dotColor="var(--ink)">ضمانت اک‌دراپ</Eyebrow>
          <p className="big-quote" style={{ marginTop: 28 }}>پاس تو،<br /><b>تا روز آخر بیمه است.</b></p>
          <p className="muted" style={{ marginTop: 18, fontSize: 14 }}>فعال نشد؟ کل مبلغ برمی‌گردد. قطع شد؟ جایگزین می‌کنیم. <Link className="link" href="/guarantee">شرایط کامل ضمانت</Link></p>
          <form className="track" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("code") || "").trim().toUpperCase(); if (/^AD-\d{5,6}$/.test(v)) { router.push(`/orders/${v}`); return; } setTracked(v || "AD-482137"); }}>
            <input name="code" placeholder="AD-48213" aria-label="کد سفارش" />
            <button>پیگیری <Icon id="arrow" className="arrow" style={{ width: 14, height: 14, verticalAlign: -2 }} /></button>
          </form>
          <div className={`status ${tracked ? "on" : ""}`}><span className="pulse" /><span>کد <b className="en">{tracked}</b> درست نیست. کد سفارش مثل AD-482137 است. <Link className="link" href="/login?next=/account/orders">وارد حسابت شو</Link></span></div>
        </div>
        <ol className="promises reveal">
          {promises.map(([h, p], i) => (
            <li key={h}><span className="k">{String(i + 1).padStart(2, "0")}</span><div><h4>{h}</h4><p>{p}</p></div></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const TIERS = [
  { key: "MEMBER", title: "عضو", perks: ["امتیاز هر خرید", "تمدید یک‌کلیکی"], req: "خرید اول" },
  { key: "INSIDER", title: "اینسایدر", perks: ["دراپ‌ها زودتر", "۵٪ تخفیف تمدید"], req: "خرید سوم" },
  { key: "PRIME", title: "پرایم", perks: ["دراپ‌های اختصاصی", "کارشناس شخصی"], req: "خرید دهم" },
];

const FAQ: [string, string][] = [
  ["«روی ایمیل خودم» یعنی چه؟", "اشتراک روی اکانت شخصی خودت فعال می‌شود. تاریخچه‌ات می‌ماند و فقط تو به آن دسترسی داری."],
  ["«اکانت آماده» چیست؟", "یک اکانت تازه که فقط مال توست. ایمیل و رمزش را تحویل می‌گیری. ارزان‌تر و سریع‌تر است."],
  ["چقدر طول می‌کشد؟", "معمولاً کمتر از ۱۵ دقیقه. زمان هر ابزار روی پاسش نوشته شده."],
  ["اگر وسط دوره قطع شد؟", "جایگزین می‌کنیم. اگر نشد، پول روزهای باقی‌مانده برمی‌گردد."],
];

export function Concierge() {
  return (
    <section id="concierge">
      <div className="wrap faq-g">
        <div className="reveal">
          <Eyebrow>پشتیبانی</Eyebrow>
          <h2 style={{ fontWeight: 300, fontSize: "clamp(32px,4vw,56px)", lineHeight: 1.2, letterSpacing: "-.025em", marginTop: 22 }}>
            سؤال داری؟<br /><b style={{ fontWeight: 600 }}>یک آدم جواب می‌دهد.</b>
          </h2>
          <div className="concierge">
            <p>هر روز، ۹ صبح تا ۱۲ شب، همین‌جا در چت آنلاین.</p>
            <button className="btn btn-paper" onClick={openChat}>شروع گفت‌وگو <Icon id="arrow" className="arrow" /></button>
          </div>
        </div>
        <div className="faq reveal">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0}><summary>{q}<span className="pm" /></summary><p>{a}</p></details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { notify } = useStore();
  const popular = listed().slice(0, 8);
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-cta">
          <div>
            <b>سؤالی داری؟ یک آدم جواب می‌دهد.</b>
            <small>هر روز ۹ صبح تا ۱۲ شب، در چت آنلاین یا تیکت.</small>
          </div>
          <div className="ft-cta-a">
            <button className="btn btn-paper" onClick={openChat}><Icon id="chat" />چت با پشتیبانی</button>
            <form className="ft-news" onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); notify("ثبت شد؛ دراپ‌های بعدی را پیامک می‌کنیم."); }}>
              <input type="tel" inputMode="numeric" placeholder="موبایل برای خبر دراپ‌ها" aria-label="شماره موبایل" required pattern="0?9[0-9]{9}" />
              <button>عضویت</button>
            </form>
          </div>
        </div>

        <div className="ft-g">
          <div className="ft-brand">
            <Wordmark className="ft-wm" />
            <p>اشتراک و سرویس‌های دیجیتال خارجی، با تومان و روی اکانت خودت. با ضمانت بازگشت وجه و پشتیبانی فارسی.</p>
            <div className="ft-social">
              <a href="#" aria-label="تلگرام">تلگرام</a><a href="#" aria-label="اینستاگرام">اینستاگرام</a><a href="mailto:hello@accdrop.ir" className="en">hello@accdrop.ir</a>
            </div>
            <div className="ft-badges" aria-label="نمادها"><span>نماد اعتماد<br />الکترونیکی</span><span>ساماندهی<br />کسب‌وکار</span></div>
          </div>
          <nav aria-label="دسته‌ها"><h5>دسته‌ها</h5><ul>{(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).filter((c) => c !== "all").map((c) => <li key={c}><Link href={`/services?c=${c}`}>{CATEGORIES[c]}</Link></li>)}</ul></nav>
          <nav aria-label="پرفروش‌ها"><h5>پرفروش‌ها</h5><ul>{popular.map((p) => <li key={p.id}><Link href={productHref(p)} className="en">{p.name}</Link></li>)}</ul></nav>
          <nav aria-label="راهنما"><h5>راهنما</h5><ul><li><Link href="/account/orders">پیگیری سفارش</Link></li><li><Link href="/guarantee">ضمانت و بازگشت وجه</Link></li><li><Link href="/group">خرید گروهی</Link></li><li><Link href="/#concierge">سؤالات پرتکرار</Link></li><li><Link href="/account/tickets">تیکت پشتیبانی</Link></li><li><Link href="/terms">قوانین و مقررات</Link></li></ul></nav>
          <nav aria-label="اک‌دراپ"><h5>اک‌دراپ</h5><ul><li><Link href="/blog">بلاگ</Link></li><li><Link href="/#drop">دراپ‌ها</Link></li><li><Link href="/reseller">نمایندگی فروش</Link></li><li><Link href="/contact">تماس با ما</Link></li></ul></nav>
        </div>

        <div className="ft-pay">
          <span>روش‌های پرداخت:</span><i>کارت‌های عضو شتاب</i><i>درگاه زرین‌پال</i><i className="en">USDT · BTC · TRX</i>
        </div>
        <div className="legal"><span>© ۱۴۰۵ اک‌دراپ · همه حقوق محفوظ است.</span><span className="en">accdrop.ir</span></div>
      </div>
    </footer>
  );
}

export function MobileBar() {
  const { cart, openSearch, setView } = useStore();
  const { user } = useAccount();
  // Checkout has its own sticky pay bar.
  if (usePathname() === "/checkout") return null;
  return (
    <nav className="mbar" aria-label="ناوبری موبایل">
      <Link href="/services"><Icon id="grid" />سرویس‌ها</Link>
      <button onClick={openSearch}><Icon id="search" />جست‌وجو</button>
      <Link href={user ? "/account" : "/login"}><Icon id="user" />{user ? "حساب من" : "ورود"}</Link>
      <button onClick={() => setView("cart")}><Icon id="bag" /><span>سبد <span className="num">({fa(cart.length)})</span></span></button>
    </nav>
  );
}
