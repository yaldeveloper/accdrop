"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, CURRENT_DROP, DELIVERY, PRODUCTS, VOICES, minPrice, planKeys, productById, type Category } from "@/lib/catalog";
import { duration, fa, money, pad2 } from "@/lib/format";
import { Dots, Eyebrow, Glyph, Icon, Wordmark } from "./brand";
import { HeroSearch } from "./search";
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
        <a href="#" aria-label="اک‌دراپ"><Wordmark /></a>
        <nav aria-label="منوی اصلی">
          <a href="#collection">مجموعه</a><a href="#drop">دراپ</a><a href="#shield">شیلد</a><a href="#club">کلاب</a><a href="#concierge">پشتیبانی</a>
        </nav>
        <div className="sp" />
        <div className="tools">
          <button onClick={openSearch} aria-label="جست‌وجو"><Icon id="search" /><span className="tx">جست‌وجو</span></button>
          <a href="#shield" aria-label="پیگیری سفارش"><Icon id="user" /><span className="tx">سفارش‌ها</span></a>
          <button onClick={() => setView("cart")} aria-label="سبد خرید"><Icon id="bag" /><span className="num">({fa(cart.length)})</span></button>
        </div>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="hero" style={{ paddingBottom: 56 }}>
      <Glyph className="hero-glyph" />
      <div className="wrap" style={{ position: "relative", width: "100%" }}>
        <Eyebrow start={false}>Premium access · AI &amp; Pro Software</Eyebrow>
        <h1>دسترسی ممتاز به <b>هوشمندترین</b> ابزارهای دنیا.</h1>
        <div className="hero-b">
          <HeroSearch />
          <p>مجموعه‌ای گلچین‌شده از اشتراک‌های هوش مصنوعی و نرم‌افزارهای حرفه‌ای؛ با قیمت نهایی، تحویل در چند دقیقه و گارانتی تا آخرین روز.</p>
        </div>
      </div>
    </section>
  );
}

export function Figures() {
  const figs: [string, string, string][] = [
    ["۱۱", "دقیقه", "میانگین زمان تحویل"],
    ["۱۰۰", "٪", "گارانتی تا آخرین روز اشتراک"],
    ["۲٬۴۰۰", "+", "مشتری که دوباره برگشته‌اند"],
    ["۴.۹", "/۵", "میانگین رضایت خریداران"],
  ];
  return (
    <div className="wrap">
      <div className="figs reveal">
        {figs.map(([n, u, l]) => <div key={l}><b className="num">{n}<small>{u}</small></b><span>{l}</span></div>)}
      </div>
    </div>
  );
}

export function Collection() {
  const { openProduct } = useStore();
  const [cat, setCat] = useState<"all" | Category>("all");
  const list = PRODUCTS.filter((p) => cat === "all" || p.category === cat);
  return (
    <section className="light" id="collection" style={{ marginTop: 140 }}>
      <div className="wrap">
        <div className="head reveal">
          <div>
            <Eyebrow dotColor="var(--ink)">The Collection</Eyebrow>
            <h2>کاتالوگ کوچک،<br /><b>فقط بهترین‌ها.</b></h2>
          </div>
          <p className="muted">ما همه‌چیز نمی‌فروشیم. فقط ابزارهایی را نگه می‌داریم که حرفه‌ای‌ها هر روز با آن‌ها کار می‌کنند، و پشت تک‌تکشان می‌ایستیم.</p>
        </div>
        <div className="filters" role="tablist">
          {(Object.keys(CATEGORIES) as ("all" | Category)[]).map((k) => (
            <button key={k} className={k === cat ? "on" : ""} onClick={() => setCat(k)} role="tab" aria-selected={k === cat}>
              {CATEGORIES[k]}<sup>{String(k === "all" ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === k).length).padStart(2, "0")}</sup>
            </button>
          ))}
        </div>
        <div className="index">
          {list.map((p, i) => {
            const isDrop = CURRENT_DROP.productId === p.id;
            return (
              <div className="row" key={p.id} tabIndex={0} role="button" aria-label={p.name}
                onClick={() => openProduct(p.id)} onKeyDown={(e) => e.key === "Enter" && openProduct(p.id)}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <div className="nm"><span className="mono">{p.monogram}</span><div><b>{p.name}</b><small className="en">{p.maker}</small></div></div>
                <span className="ds">{p.description}{isDrop && <><br /><span className="flag"><Dots size={3} color="var(--ink)" /> در دراپ این هفته</span></>}</span>
                <span className="meta"><span>{planKeys(p).map(duration).join(" / ")}</span><span>تحویل حدود {fa(p.etaMinutes)} دقیقه</span></span>
                <span className="pr">
                  {isDrop && <s className="num">{money(CURRENT_DROP.was)}</s>}
                  <b className="num">{money(isDrop ? CURRENT_DROP.price : minPrice(p))}</b>
                  <small>{isDrop ? "تومان" : "از · تومان"}</small>
                </span>
                <span className="go"><Icon id="arrow" className="arrow" style={{ width: 16, height: 16 }} /></span>
              </div>
            );
          })}
        </div>
        <div className="foot-note"><span>همه قیمت‌ها به تومان و نهایی‌اند.</span><span>داده نمونه؛ قیمت واقعی از پنل مدیریت می‌آید.</span></div>
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
            <p className="muted" style={{ marginTop: 28, maxWidth: 420, fontWeight: 300 }}>هر دراپ یک فرصت محدود است: تعداد مشخص، زمان مشخص، همان گارانتی و همان پشتیبانی. وقتی تمام شود، تکرار نمی‌شود.</p>
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
            <button className="btn btn-paper btn-block" onClick={() => openProduct(p.id)}>دریافت دراپ <Icon id="arrow" className="arrow" /></button>
          </div>
        </div>
        <div className="next reveal">
          <div>
            <b style={{ fontWeight: 500 }}>دراپ №{fa(String(d.number + 1).padStart(2, "0"))} · پنجشنبه، ساعت ۲۰:۰۰</b>
            <div className="muted" style={{ fontSize: 13, fontWeight: 300 }}>اعضای کلاب یک ساعت زودتر دسترسی دارند.</div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); notify("ثبت شد. دراپ بعدی را پیش از همه خبر می‌دهیم."); }}>
            <input type="tel" inputMode="numeric" placeholder="شماره موبایل برای اطلاع‌رسانی" aria-label="شماره موبایل" required />
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
    ["گارانتی کل دوره", "اگر اشتراک قطع شود، جایگزین می‌کنیم؛ اگر ممکن نبود، مبلغ روزهای باقی‌مانده برمی‌گردد."],
    ["روی اکانت خودت", "بیشتر اشتراک‌ها روی ایمیل شخصی‌ات فعال می‌شوند. هرگز رمز عبورت را نمی‌پرسیم."],
    ["شفافیت پیش از پرداخت", "قیمت نهایی، نوع تحویل، زمان تحویل و شرایط گارانتی، همه قبل از خرید مکتوب‌اند."],
    ["پیگیری لحظه‌ای", "از پرداخت تا فعال‌سازی، هر مرحله را می‌بینی و پیامکش را می‌گیری."],
  ];
  return (
    <section className="light" id="shield">
      <div className="wrap shield-g">
        <div className="reveal">
          <Eyebrow dotColor="var(--ink)">AccDrop Shield</Eyebrow>
          <p className="big-quote" style={{ marginTop: 28 }}>خرید، شروع رابطه ماست.<br /><b>تا آخرین روز اشتراک کنارت هستیم.</b></p>
          <form className="track" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get("code"); setTracked(String(v || "AD-48213").toUpperCase()); }}>
            <input name="code" placeholder="AD-48213" aria-label="کد سفارش" />
            <button>پیگیری سفارش <Icon id="arrow" className="arrow" style={{ width: 14, height: 14, verticalAlign: -2 }} /></button>
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
  { key: "MEMBER", title: "عضو", perks: ["امتیاز هر خرید", "یادآور و تمدید یک‌کلیکی"], req: "از اولین خرید" },
  { key: "INSIDER", title: "اینسایدر", perks: ["امتیاز ۱.۵ برابر", "دراپ‌ها یک ساعت زودتر", "۵٪ تخفیف تمدید"], req: "پس از ۳ خرید" },
  { key: "PRIME", title: "پرایم", perks: ["امتیاز ۲ برابر", "دراپ‌های مخصوص اعضا", "کارشناس اختصاصی"], req: "پس از ۱۰ خرید" },
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
            <h2 style={{ margin: 0 }}>عضویتی که با هر خرید<br /><b>ارزشمندتر می‌شود.</b></h2>
            <p className="muted" style={{ justifySelf: "start" }}>عضویت رایگان است و با اولین خرید فعال می‌شود. هر ۱۰۰ هزار تومان خرید یک امتیاز، و هر امتیاز ۱٬۰۰۰ تومان اعتبار.</p>
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

export function Voices() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % VOICES.length), 7000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="light" style={{ padding: "120px 0" }}>
      <div className="wrap voice reveal">
        <div className="eyebrow" style={{ justifyContent: "center", marginBottom: 40 }}><span className="en">Voices</span></div>
        <blockquote key={i}>«{VOICES[i][0]}»</blockquote>
        <cite>{VOICES[i][1]}</cite>
        <div className="vnav">
          {VOICES.map((_, j) => <button key={j} className={j === i ? "on" : ""} onClick={() => setI(j)} aria-label={`نظر ${fa(j + 1)}`} />)}
        </div>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  ["«روی ایمیل خودت» با «اکانت آماده» چه فرقی دارد؟", "«روی ایمیل خودت» یعنی اشتراک روی اکانت شخصی‌ات فعال می‌شود؛ تاریخچه و تنظیماتت حفظ می‌شود و فقط تو به آن دسترسی داری. «اکانت آماده» یک اکانت اختصاصی تازه است که ایمیل و رمزش را تحویل می‌گیری؛ سریع‌تر و اقتصادی‌تر است."],
  ["چقدر طول می‌کشد تا اشتراک فعال شود؟", "زمان تحویل هر محصول کنار قیمتش آمده و بیشتر سفارش‌ها زیر پانزده دقیقه فعال می‌شوند. هر مرحله را در صفحه پیگیری می‌بینی."],
  ["اگر اشتراک وسط دوره قطع شود؟", "شیلد کل دوره را پوشش می‌دهد. اول جایگزین می‌کنیم؛ اگر ممکن نبود، مبلغ روزهای باقی‌مانده را برمی‌گردانیم."],
  ["چرا همه‌ی اشتراک‌ها را نمی‌فروشید؟", "چون فقط چیزی را می‌فروشیم که بتوانیم با اطمینان کامل گارانتی‌اش کنیم. کاتالوگ کوچک یعنی کیفیت و پشتیبانی بهتر برای هر محصول."],
  ["تمدید چطور انجام می‌شود؟", "سه روز پیش از پایان اشتراک یادآور می‌گیری و با یک کلیک، همان پلن را با مزایای کلاب تمدید می‌کنی."],
];

export function Concierge() {
  return (
    <section id="concierge">
      <div className="wrap faq-g">
        <div className="reveal">
          <Eyebrow>Concierge</Eyebrow>
          <h2 style={{ fontWeight: 300, fontSize: "clamp(32px,4vw,56px)", lineHeight: 1.2, letterSpacing: "-.025em", marginTop: 22 }}>
            سؤالی هست؟<br /><b style={{ fontWeight: 600 }}>یک انسان جواب می‌دهد.</b>
          </h2>
          <div className="concierge">
            <p>کارشناسان ما هر روز از ۹ صبح تا ۱۲ شب در تلگرام پاسخ می‌دهند. میانگین زمان پاسخ کمتر از پنج دقیقه است.</p>
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
          <div><h5>COLLECTION</h5><ul><li><a href="#collection" className="en">ChatGPT Plus</a></li><li><a href="#collection" className="en">Claude Pro</a></li><li><a href="#collection" className="en">Cursor Pro</a></li><li><a href="#collection">همه محصولات</a></li></ul></div>
          <div><h5>ACCDROP</h5><ul><li><a href="#drop">دراپ‌ها</a></li><li><a href="#club">کلاب</a></li><li><a href="#shield">شیلد</a></li></ul></div>
          <div><h5>SUPPORT</h5><ul><li><a href="#shield">پیگیری سفارش</a></li><li><a href="#">شرایط گارانتی</a></li><li><a href="#concierge">سؤالات پرتکرار</a></li></ul></div>
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
      <a href="#collection"><Icon id="grid" />مجموعه</a>
      <button onClick={openSearch}><Icon id="search" />جست‌وجو</button>
      <a href="#shield"><Icon id="box" />سفارش‌ها</a>
      <button onClick={() => setView("cart")}><Icon id="bag" /><span>سبد <span className="num">({fa(cart.length)})</span></span></button>
    </nav>
  );
}
