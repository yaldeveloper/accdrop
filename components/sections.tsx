"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, CURRENT_DROP, DELIVERY, PRODUCTS, minPrice, productById, type Category, type Product } from "@/lib/catalog";
import { duration, fa, money, pad2 } from "@/lib/format";
import { BrandLogo, Dots, Eyebrow, Icon, Wordmark } from "./brand";
import Link from "next/link";
import { productHref } from "@/lib/content";
import { splitName } from "./pass";
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
        <Link href="/" aria-label="اک‌دراپ، صفحه اصلی"><Wordmark /></Link>
        <nav aria-label="منوی اصلی">
          <Link href="/#tools">همه ابزارها</Link><Link href="/#drop">دراپ هفته</Link><Link href="/#support">پشتیبانی</Link>
        </nav>
        <div className="sp" />
        <div className="tools">
          <button onClick={openSearch} aria-label="جست‌وجو"><Icon id="search" /><span className="tx">جست‌وجو</span></button>
          <button onClick={() => setView("cart")} aria-label="سبد خرید"><Icon id="bag" />{cart.length > 0 && <span className="num cart-n">{fa(cart.length)}</span>}</button>
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

/** Hero = the store itself: headline, a filter-as-you-type field, and every tool with its logo. */
export function Hero() {
  const [cat, setCat] = useState<"all" | Category>("all");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = PRODUCTS.filter((p) => (cat === "all" || p.category === cat)
    && (!query || `${p.name} ${p.maker} ${p.description} ${p.use}`.toLowerCase().includes(query)));
  return (
    <section className="hero3" id="tools">
      <div className="wrap">
        <div className="hero3-h">
          <h1>اشتراک ابزارهای حرفه‌ای،<br /><b>با تومان. در چند دقیقه.</b></h1>
          <p className="lead">ابزارت را انتخاب کن، بپرداز و روی ایمیل خودت تحویل بگیر.</p>
        </div>
        <div className="hero3-bar">
          <label className="find">
            <Icon id="search" />
            <input type="search" placeholder="دنبال چه ابزاری هستی؟" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جست‌وجوی ابزار" />
          </label>
          <div className="chips" role="tablist" aria-label="دسته‌بندی">
            {(Object.keys(CATEGORIES) as ("all" | Category)[]).map((k) => (
              <button key={k} className={k === cat ? "on" : ""} onClick={() => setCat(k)} role="tab" aria-selected={k === cat}>{CATEGORIES[k]}</button>
            ))}
          </div>
        </div>
        {list.length ? (
          <div className="tiles">{list.map((p) => <ToolCard key={p.id} p={p} />)}</div>
        ) : (
          <div className="none-found">این ابزار را هنوز نداریم. <a className="link" href="#support">به ما بگو</a> تا اضافه‌اش کنیم.</div>
        )}
        <ul className="assure-row">
          <li><Dots size={3} />فعال‌سازی در حدود ۱۰ دقیقه</li>
          <li><Dots size={3} />فقط ایمیل، هرگز رمز</li>
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
    ["با تومان بپرداز", "کارت بانکی، بدون ارز"],
    ["استفاده کن", "چند دقیقه بعد، روی ایمیل خودت"],
  ];
  return (
    <section className="steps3 light">
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

/** AccDrop Deals: one limited pass per week, shown as a single strip. */
export function DropSection() {
  const d = CURRENT_DROP, p = productById(d.productId);
  const left = useCountdownToMidnight();
  const off = Math.round((1 - d.price / d.was) * 100);
  return (
    <section className="drop2" id="drop">
      <div className="wrap">
        <Link href={productHref(p)} className="drop2-card reveal">
          <div className="drop2-a">
            <Eyebrow>{`AccDrop Deals · №${String(d.number).padStart(2, "0")}`}</Eyebrow>
            <h2><span className="drop2-logo"><BrandLogo id={p.id} size={34} /></span><span className="en">{p.name}</span></h2>
            <p className="muted">{duration(d.plan)} • {DELIVERY[d.type].title} • فقط {fa(d.left)} عدد باقی مانده</p>
          </div>
          <div className="drop2-b">
            <div className="drop2-price"><s className="num">{money(d.was)}</s><b className="num">{money(d.price)}</b><small>تومان</small><span className="num">{fa(off)}٪ تخفیف</span></div>
            <div className="drop2-clock num" aria-label="زمان باقی‌مانده">{left ? left.map(pad2).join(":") : "--:--:--"}</div>
            <span className="btn btn-paper">بگیرش <Icon id="arrow" className="arrow" /></span>
          </div>
        </Link>
      </div>
    </section>
  );
}

const PROMISES: [string, string][] = [
  ["فقط ایمیل، نه رمز.", "اشتراک روی اکانت خودت فعال می‌شود و تاریخچه‌ات می‌ماند."],
  ["قطع شد؟ جایگزین می‌کنیم.", "تا روز آخر اشتراک. اگر نشد، پول روزهای باقی‌مانده برمی‌گردد."],
  ["همه‌چیز شفاف.", "قیمت نهایی همان است که می‌بینی. وضعیت سفارش را پیامک می‌کنیم."],
];

/** AccDrop Shield: the guarantee, in three lines. */
export function Shield() {
  return (
    <section className="light" id="shield">
      <div className="wrap shield-g">
        <div className="reveal">
          <Eyebrow dotColor="var(--ink)">AccDrop Shield</Eyebrow>
          <p className="big-quote" style={{ marginTop: 28 }}>خیالت راحت،<br /><b>تا روز آخر.</b></p>
        </div>
        <ol className="promises reveal">
          {PROMISES.map(([h, t], i) => (
            <li key={h}><span className="k">{String(i + 1).padStart(2, "0")}</span><div><h4>{h}</h4><p>{t}</p></div></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  ["«روی ایمیل خودم» یعنی چه؟", "اشتراک روی اکانت شخصی خودت فعال می‌شود. فقط ایمیلت را می‌خواهیم، نه رمزت را."],
  ["«اکانت آماده» چیست؟", "یک اکانت تازه که فقط مال توست. ایمیل و رمزش را تحویل می‌گیری. ارزان‌تر و سریع‌تر است."],
  ["چقدر طول می‌کشد؟", "معمولاً کمتر از ۱۵ دقیقه. زمان هر ابزار در صفحه خودش نوشته شده."],
  ["اگر وسط دوره قطع شد؟", "جایگزین می‌کنیم. اگر نشد، پول روزهای باقی‌مانده برمی‌گردد."],
];

/** Support: FAQ, human contact and order tracking in one place. */
export function Support() {
  const [tracked, setTracked] = useState<string | null>(null);
  return (
    <section id="support">
      <div className="wrap faq-g">
        <div className="reveal">
          <Eyebrow>Concierge</Eyebrow>
          <h2 className="pdp-h">سؤال داری؟<br /><b>یک آدم جواب می‌دهد.</b></h2>
          <div className="concierge">
            <p>هر روز، ۹ صبح تا ۱۲ شب، در تلگرام.</p>
            <a className="btn btn-ghost" href="#">گفت‌وگو در تلگرام <Icon id="arrow" className="arrow" /></a>
          </div>
          <form className="track" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get("code"); setTracked(String(v || "AD-48213").toUpperCase()); }}>
            <input name="code" placeholder="کد سفارش، مثل AD-48213" aria-label="کد سفارش" />
            <button>پیگیری <Icon id="arrow" className="arrow" style={{ width: 14, height: 14, verticalAlign: -2 }} /></button>
          </form>
          {/* Sample status; wire to the orders API. */}
          <div className={`status ${tracked ? "on" : ""}`}><span className="pulse" /><span>سفارش <b className="en">{tracked}</b> در حال فعال‌سازی است • حدود ۸ دقیقه</span></div>
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
          <div><h5>TOOLS</h5><ul className="f-products">{PRODUCTS.map((p) => <li key={p.id}><Link href={productHref(p)} className="en">{p.name}</Link></li>)}</ul></div>
          <div><h5>ACCDROP</h5><ul><li><Link href="/#drop">دراپ هفته</Link></li><li><Link href="/#shield">گارانتی شیلد</Link></li><li><span className="muted">کلاب: هر خرید امتیاز دارد</span></li></ul></div>
          <div><h5>SUPPORT</h5><ul><li><Link href="/#support">پیگیری سفارش</Link></li><li><Link href="/#support">سؤالات پرتکرار</Link></li></ul></div>
          <div><h5>CONTACT</h5><ul><li><a href="#">تلگرام</a></li><li><a href="#">اینستاگرام</a></li><li><a href="#" className="en">hello@accdrop.ir</a></li></ul></div>
        </div>
        <Wordmark className="f-wm" />
        <div className="legal"><span>© ۱۴۰۵ اک‌دراپ • اشتراک ابزارهای حرفه‌ای</span><span className="en">accdrop.ir</span></div>
      </div>
    </footer>
  );
}

export function MobileBar() {
  const { cart, openSearch, setView } = useStore();
  return (
    <nav className="mbar" aria-label="ناوبری موبایل">
      <Link href="/#tools"><Icon id="grid" />ابزارها</Link>
      <button onClick={openSearch}><Icon id="search" />جست‌وجو</button>
      <Link href="/#support"><Icon id="box" />پشتیبانی</Link>
      <button onClick={() => setView("cart")}><Icon id="bag" /><span>سبد <span className="num">({fa(cart.length)})</span></span></button>
    </nav>
  );
}
