"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { CATEGORIES, CURRENT_DROP, DELIVERY, PRODUCTS, minPrice, planKeys, productById, type Category, type Product } from "@/lib/catalog";
import { duration, fa, money, pad2 } from "@/lib/format";
import { BrandLogo, Dots, Eyebrow, Glyph, Icon, Wordmark } from "./brand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { productHref } from "@/lib/content";
import { AccessPass, splitName } from "./pass";
import { useStore } from "./store";

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
  const [scrolled, setScrolled] = useState(false);
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
          <a href="/#collection">مجموعه</a><a href="/#drop">دراپ</a><a href="/#shield">شیلد</a><a href="/#club">کلاب</a><a href="/#concierge">پشتیبانی</a>
        </nav>
        <div className="sp" />
        <div className="tools">
          <button onClick={openSearch} aria-label="جست‌وجو"><Icon id="search" /><span className="tx">جست‌وجو</span></button>
          <a href="/#shield" aria-label="پیگیری سفارش"><Icon id="user" /><span className="tx">سفارش‌ها</span></a>
          <button onClick={() => setView("cart")} aria-label="سبد خرید"><Icon id="bag" /><span className="num">({fa(cart.length)})</span></button>
        </div>
      </div>
    </header>
  );
}

/** One product card: brand mark, name, what it is for, starting price. */
export function ToolCard({ p }: { p: Product }) {
  const isDrop = CURRENT_DROP.productId === p.id;
  const [tool, tier] = splitName(p.name);
  return (
    <Link className="tile" href={productHref(p)}>
      <span className="tile-top">
        <span className="tile-logo"><BrandLogo id={p.id} size={26} /></span>
        {isDrop && <span className="tile-drop">{fa(Math.round((1 - CURRENT_DROP.price / CURRENT_DROP.was) * 100))}٪ تخفیف</span>}
      </span>
      <b className="en tile-tool">{tool}{tier && <small> {tier}</small>}</b>
      <span className="tile-use">{p.use}</span>
      <span className="tile-foot">
        <span>از <b className="num">{money(isDrop ? CURRENT_DROP.price : minPrice(p))}</b> تومان</span>
        <Icon id="arrow" className="arrow" style={{ width: 16, height: 16 }} />
      </span>
    </Link>
  );
}

const FEATURED = ["chatgpt", "claude", "cursor", "adobe", "canva", "notion"];

export function Hero() {
  const router = useRouter();
  const [active, setActive] = useState(FEATURED[0]);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((a) => FEATURED[(FEATURED.indexOf(a) + 1) % FEATURED.length]), 3200);
    return () => clearInterval(t);
  }, [paused]);
  const order = [...FEATURED.slice(FEATURED.indexOf(active)), ...FEATURED.slice(0, FEATURED.indexOf(active))];
  const p = productById(active);

  return (
    <section className="hero2">
      <div className="wrap hero2-g">
        <div>
          <Eyebrow>AI &amp; Pro Tools</Eyebrow>
          <h1>اشتراک ابزارهای حرفه‌ای،<br /><b>به ساده‌ترین شکل.</b></h1>
          <p className="lead">هوش مصنوعی، طراحی، کدنویسی و کار روزمره. با تومان بخر؛ چند دقیقه بعد روی ایمیل خودت فعال است.</p>
          <div className="pick" role="group" aria-label="انتخاب ابزار" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            {FEATURED.map((id) => (
              <button key={id} className={`en ${id === active ? "on" : ""}`} onClick={() => { setActive(id); setPaused(true); }}>
                <BrandLogo id={id} size={16} />{id === "adobe" ? "Adobe" : splitName(productById(id).name)[0]}
              </button>
            ))}
            <a href="/#collection" className="more">همه ابزارها</a>
          </div>
          <div className="hero2-cta">
            <Link className="btn btn-paper" href={productHref(p)}>
              دریافت <span className="en">{p.name}</span> <Icon id="arrow" className="arrow" />
            </Link>
            <span className="muted">از <b className="num" style={{ color: "var(--paper)", fontWeight: 500 }}>{money(CURRENT_DROP.productId === p.id ? Math.min(CURRENT_DROP.price, minPrice(p)) : minPrice(p))}</b> تومان</span>
          </div>
        </div>
        <div className="deck" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {order.slice(0, 3).reverse().map((id, i, arr) => {
            const depth = arr.length - 1 - i;
            const prod = productById(id);
            return (
              <button key={id} className="deck-card" style={{ "--z": depth } as React.CSSProperties}
                onClick={() => (depth === 0 ? router.push(productHref(prod)) : setActive(id))} aria-label={prod.name}>
                <AccessPass product={prod} months={planKeys(prod)[0]} price={depth === 0 ? minPrice(prod) : undefined} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="wrap">
        <ul className="assure-row">
          <li><Dots size={3} />فعال‌سازی در حدود ۱۱ دقیقه</li>
          <li><Dots size={3} />فقط ایمیل؛ هرگز رمز عبور</li>
          <li><Dots size={3} />گارانتی تا روز آخر</li>
          <li><Dots size={3} />پشتیبانی انسانی</li>
        </ul>
      </div>
    </section>
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
  const [cat, setCat] = useState<"all" | Category>("all");
  const list = PRODUCTS.filter((p) => cat === "all" || p.category === cat);
  return (
    <section className="light" id="collection">
      <div className="wrap">
        <div className="head reveal">
          <div>
            <Eyebrow dotColor="var(--ink)">All Passes</Eyebrow>
            <h2>به چه چیزی<br /><b>نیاز داری؟</b></h2>
          </div>
          <p className="muted">کاتالوگ کوچک، فقط ابزارهایی که حرفه‌ای‌ها هر روز استفاده می‌کنند.</p>
        </div>
        <div className="filters" role="tablist">
          {(Object.keys(CATEGORIES) as ("all" | Category)[]).map((k) => (
            <button key={k} className={k === cat ? "on" : ""} onClick={() => setCat(k)} role="tab" aria-selected={k === cat}>{CATEGORIES[k]}</button>
          ))}
        </div>
        <div className="tiles">
          {list.map((p) => <ToolCard key={p.id} p={p} />)}
        </div>
        <div className="foot-note"><span>قیمت‌ها نهایی‌اند.</span><span>داده نمونه</span></div>
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
  const { openProduct, notify } = useStore();
  const d = CURRENT_DROP, p = productById(d.productId);
  const left = useCountdownToMidnight();
  return (
    <section className="drop" id="drop">
      <div className="wrap">
        <div className="drop-g">
          <div className="reveal">
            <Eyebrow>AccDrop Deals</Eyebrow>
            <div className="drop-no" style={{ marginTop: 28 }}>№{String(d.number).padStart(2, "0")}<sup>DROP</sup></div>
            <p className="muted" style={{ marginTop: 28, maxWidth: 420, fontWeight: 300, fontSize: 18 }}>پاس‌های محدود، با قیمت ویژه.<br />وقتی تمام شود، تمام شده.</p>
          </div>
          <div className="drop-card reveal">
            <span className="tag">LIMITED</span>
            <h3>{p.name}</h3>
            <div className="sub">{duration(d.plan)} · {DELIVERY[d.type].title}</div>
            <div className="price">
              <b className="num">{money(d.price)}</b><s className="num">{money(d.was)}</s>
              <span className="num">−{fa(Math.round((1 - d.price / d.was) * 100))}٪</span>
            </div>
            <div className="clock">
              {(["ساعت", "دقیقه", "ثانیه"] as const).map((u, i) => <div key={u}><b className="num">{left ? pad2(left[i]) : "--"}</b><span>{u}</span></div>)}
            </div>
            <div className="stock"><span>{fa(d.left)} از {fa(d.of)} باقی‌مانده</span><span>{fa(Math.round((d.left / d.of) * 100))}٪</span></div>
            <div className="meter"><i style={{ width: `${(d.left / d.of) * 100}%` }} /></div>
            <button className="btn btn-paper btn-block" onClick={() => openProduct(p.id)}>بگیرش <Icon id="arrow" className="arrow" /></button>
          </div>
        </div>
        <div className="next reveal">
          <div>
            <b style={{ fontWeight: 500 }}>دراپ №{fa(String(d.number + 1).padStart(2, "0"))} · پنجشنبه، ساعت ۲۰:۰۰</b>
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
  const promises: [string, string][] = [
    ["قطع شد؟ جایگزین می‌کنیم.", "تا روز آخر اشتراک. اگر نشد، پول روزهای باقی‌مانده برمی‌گردد."],
    ["فقط ایمیل، نه رمز.", "اشتراک روی اکانت خودت فعال می‌شود."],
    ["همه‌چیز را می‌بینی.", "از پرداخت تا فعال‌سازی، قدم‌به‌قدم."],
  ];
  return (
    <section className="light" id="shield">
      <div className="wrap shield-g">
        <div className="reveal">
          <Eyebrow dotColor="var(--ink)">AccDrop Shield</Eyebrow>
          <p className="big-quote" style={{ marginTop: 28 }}>پاس تو،<br /><b>تا روز آخر بیمه است.</b></p>
          <form className="track" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get("code"); setTracked(String(v || "AD-48213").toUpperCase()); }}>
            <input name="code" placeholder="AD-48213" aria-label="کد سفارش" />
            <button>پیگیری <Icon id="arrow" className="arrow" style={{ width: 14, height: 14, verticalAlign: -2 }} /></button>
          </form>
          {/* Sample status; wire to the orders API. */}
          <div className={`status ${tracked ? "on" : ""}`}><span className="pulse" /><span>سفارش <b className="en">{tracked}</b> در حال فعال‌سازی است · حدود ۸ دقیقه</span></div>
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

export function Club() {
  const [tier, setTier] = useState("INSIDER");
  return (
    <section id="club">
      <div className="wrap club-g">
        <div className="card3d reveal">
          <div className="mcard">
            <Glyph />
            <div className="top"><Wordmark /><span className="tier">{tier}</span></div>
            <div className="bot"><div><small>MEMBER</small><b>YOUR NAME · 2026</b></div><Dots size={6} /></div>
          </div>
        </div>
        <div className="reveal">
          <Eyebrow>AccDrop Club</Eyebrow>
          <div className="head" style={{ gridTemplateColumns: "1fr", margin: "22px 0 48px", gap: 16 }}>
            <h2 style={{ margin: 0 }}>بیشتر بخر،<br /><b>کمتر بپرداز.</b></h2>
            <p className="muted" style={{ justifySelf: "start" }}>هر خرید امتیاز دارد. عضویت رایگان و خودکار است.</p>
          </div>
          <div className="tiers">
            {TIERS.map((t) => (
              <div key={t.key} className={t.key === tier ? "on" : ""} onClick={() => setTier(t.key)} onMouseEnter={() => setTier(t.key)}>
                <div className="lv">{t.key}</div><h4>{t.title}</h4>
                <ul>{t.perks.map((x) => <li key={x}>{x}</li>)}</ul>
                <div className="req">{t.req}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

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
          <Eyebrow>Concierge</Eyebrow>
          <h2 style={{ fontWeight: 300, fontSize: "clamp(32px,4vw,56px)", lineHeight: 1.2, letterSpacing: "-.025em", marginTop: 22 }}>
            سؤال داری؟<br /><b style={{ fontWeight: 600 }}>یک آدم جواب می‌دهد.</b>
          </h2>
          <div className="concierge">
            <p>هر روز، ۹ صبح تا ۱۲ شب، در تلگرام.</p>
            <a className="btn btn-ghost" href="#">گفت‌وگو در تلگرام <Icon id="arrow" className="arrow" /></a>
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
  return (
    <footer>
      <div className="wrap">
        <div className="fg">
          <div><h5>PASSES</h5><ul className="f-products">{PRODUCTS.map((p) => <li key={p.id}><Link href={productHref(p)} className="en">{p.name}</Link></li>)}</ul></div>
          <div><h5>ACCDROP</h5><ul><li><a href="/#drop">دراپ‌ها</a></li><li><a href="/#club">کلاب</a></li><li><a href="/#shield">شیلد</a></li></ul></div>
          <div><h5>SUPPORT</h5><ul><li><a href="/#shield">پیگیری سفارش</a></li><li><a href="#">شرایط گارانتی</a></li><li><a href="/#concierge">سؤالات پرتکرار</a></li></ul></div>
          <div><h5>CONTACT</h5><ul><li><a href="#">تلگرام</a></li><li><a href="#">اینستاگرام</a></li><li><a href="#" className="en">hello@accdrop.ir</a></li></ul></div>
        </div>
        <Wordmark className="f-wm" />
        <div className="legal"><span>© ۱۴۰۵ اک‌دراپ · دسترسی ممتاز به ابزارهای هوشمند</span><span className="en">accdrop.ir</span></div>
      </div>
    </footer>
  );
}

export function MobileBar() {
  const { cart, openSearch, setView } = useStore();
  return (
    <nav className="mbar" aria-label="ناوبری موبایل">
      <a href="/#collection"><Icon id="grid" />مجموعه</a>
      <button onClick={openSearch}><Icon id="search" />جست‌وجو</button>
      <a href="/#shield"><Icon id="box" />سفارش‌ها</a>
      <button onClick={() => setView("cart")}><Icon id="bag" /><span>سبد <span className="num">({fa(cart.length)})</span></span></button>
    </nav>
  );
}
