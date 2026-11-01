import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, CURRENT_DROP, DELIVERY, PRODUCTS, deliveryTypes, minPrice, planKeys, type Product } from "@/lib/catalog";
import { CONTENT, contentOf, productHref } from "@/lib/content";
import { duration, fa, money } from "@/lib/format";
import { Eyebrow, Icon } from "@/components/brand";
import { BuyPanel } from "@/components/buy-panel";
import { splitName } from "@/components/pass";

export const dynamicParams = false;

const bySlug = (slug: string) => PRODUCTS.find((p) => CONTENT[p.id]?.slug === slug);

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: CONTENT[p.id].slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = bySlug((await params).slug);
  if (!p) return {};
  const c = contentOf(p);
  const title = `خرید اشتراک ${p.name} (${c.faName}) با تحویل فوری`;
  const description = `خرید اشتراک ${p.name} با تومان، از ${money(minPrice(p))} تومان. فعال‌سازی روی ایمیل خودت در حدود ${fa(p.etaMinutes)} دقیقه، گارانتی تا روز آخر و پشتیبانی انسانی.`;
  return {
    title, description,
    alternates: { canonical: `/${c.slug}` },
    openGraph: { title, description, url: `/${c.slug}`, type: "website", locale: "fa_IR", siteName: "AccDrop" },
  };
}

function faqFor(p: Product): [string, string][] {
  const own = deliveryTypes(p).includes("own"), ready = deliveryTypes(p).includes("ready");
  return [
    [`اشتراک ${p.name} چقدر طول می‌کشد تا فعال شود؟`, `معمولاً حدود ${fa(p.etaMinutes)} دقیقه بعد از پرداخت. هر مرحله را در صفحه پیگیری سفارش می‌بینی و پیامکش را می‌گیری.`],
    ...(own ? [[`آیا ${p.name} روی اکانت خودم فعال می‌شود؟`, "بله. فقط ایمیل اکانتت را می‌خواهیم و اشتراک روی همان فعال می‌شود. تاریخچه‌ات حفظ می‌شود و هرگز رمز عبورت را نمی‌پرسیم."] as [string, string]] : []),
    ...(ready ? [["«اکانت آماده» چه فرقی دارد؟", "یک اکانت تازه که فقط مال توست. ایمیل و رمزش را تحویل می‌گیری. ارزان‌تر و سریع‌تر است."] as [string, string]] : []),
    [`اگر اشتراک ${p.name} وسط دوره قطع شد چه می‌شود؟`, "شیلد اک‌دراپ تا روز آخر پوشش می‌دهد: جایگزین می‌کنیم و اگر ممکن نبود، مبلغ روزهای باقی‌مانده برمی‌گردد."],
    ["پرداخت چطور است؟", "با کارت بانکی و درگاه امن، به تومان. نیازی به کارت ارزی نیست."],
  ];
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = bySlug((await params).slug);
  if (!p) notFound();
  const c = contentOf(p);
  const [tool, tier] = splitName(p.name);
  const months = planKeys(p);
  const types = deliveryTypes(p);
  const faq = faqFor(p);
  const fromPrice = CURRENT_DROP.productId === p.id ? Math.min(minPrice(p), CURRENT_DROP.price) : minPrice(p);
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).concat(PRODUCTS.filter((x) => x.category !== p.category)).slice(0, 4);
  const prices = months.flatMap((m) => Object.values(p.plans[m] ?? {}) as number[]);

  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Product",
      name: `اشتراک ${p.name}`, description: c.intro, brand: { "@type": "Brand", name: p.maker }, sku: c.slug,
      offers: {
        "@type": "AggregateOffer", priceCurrency: "IRR", lowPrice: Math.min(...prices) * 10, highPrice: Math.max(...prices) * 10,
        offerCount: prices.length, availability: "https://schema.org/InStock", url: `https://accdrop.ir/${c.slug}`,
        seller: { "@type": "Organization", name: "AccDrop" },
      },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "اک‌دراپ", item: "https://accdrop.ir/" },
        { "@type": "ListItem", position: 2, name: CATEGORIES[p.category], item: "https://accdrop.ir/#collection" },
        { "@type": "ListItem", position: 3, name: p.name, item: `https://accdrop.ir/${c.slug}` },
      ],
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <main className="pdp">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="pdp-top">
        <div className="wrap">
          <nav className="crumbs" aria-label="مسیر">
            <Link href="/">اک‌دراپ</Link><span>/</span><Link href="/#collection">{CATEGORIES[p.category]}</Link><span>/</span><span className="en">{p.name}</span>
          </nav>
          <div className="pdp-g">
            <div className="pdp-info">
              <Eyebrow>{`${p.maker} · Access Pass`}</Eyebrow>
              <h1><span className="sr">خرید اشتراک </span><span className="en pdp-tool">{tool}{tier && <small> {tier}</small>}</span></h1>
              <p className="pdp-use">{p.use}</p>
              <p className="pdp-intro">{c.intro}</p>
              <ul className="pdp-facts">
                <li><small>شروع قیمت</small><b className="num">{money(fromPrice)} <i>تومان</i></b></li>
                <li><small>فعال‌سازی</small><b>~{fa(p.etaMinutes)} دقیقه</b></li>
                <li><small>گارانتی</small><b>تا روز آخر</b></li>
              </ul>
            </div>
            <BuyPanel product={p} />
          </div>
        </div>
      </section>

      <section className="light pdp-sec">
        <div className="wrap pdp-two">
          <div>
            <Eyebrow dotColor="var(--ink)">What you get</Eyebrow>
            <h2 className="pdp-h">با این پاس<br /><b>چه می‌گیری؟</b></h2>
          </div>
          <div>
            <ul className="pdp-list">{p.includes.map((x, i) => <li key={x}><span className="en k">0{i + 1}</span><span>{x}</span></li>)}</ul>
            <div className="pdp-for"><small>مناسب برای</small><div>{c.forWho.map((w) => <span key={w}>{w}</span>)}</div></div>
          </div>
        </div>
      </section>

      <section className="light pdp-sec" style={{ paddingTop: 0 }}>
        <div className="wrap pdp-two">
          <div>
            <Eyebrow dotColor="var(--ink)">How it works</Eyebrow>
            <h2 className="pdp-h">چطور<br /><b>فعال می‌شود؟</b></h2>
          </div>
          <div className="pdp-how">
            {types.map((t) => (
              <div key={t}>
                <h3>{DELIVERY[t].title}</h3>
                <ol>
                  <li>پلن را انتخاب کن و با تومان بپرداز.</li>
                  {t === "own"
                    ? <><li>ایمیل اکانت <span className="en">{p.maker}</span> خودت را وارد کن. رمز لازم نیست.</li><li>در حدود {fa(p.etaMinutes)} دقیقه، اشتراک روی همان اکانت فعال می‌شود.</li></>
                    : <><li>یک اکانت تازه برایت ساخته و فعال می‌شود.</li><li>ایمیل و رمز را پیامک و ایمیل می‌کنیم؛ می‌توانی رمز را عوض کنی.</li></>}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="light pdp-sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Eyebrow dotColor="var(--ink)">Plans</Eyebrow>
          <h2 className="pdp-h" style={{ marginBottom: 36 }}>قیمت همه پلن‌ها</h2>
          <div className="pdp-table" role="table" aria-label={`قیمت پلن‌های ${p.name}`} style={{ "--cols": types.length + 2 } as React.CSSProperties}>
            <div className="tr th" role="row"><span role="columnheader">مدت</span>{types.map((t) => <span key={t} role="columnheader">{DELIVERY[t].title}</span>)}<span role="columnheader">هر ماه از</span></div>
            {months.map((m) => {
              const o = p.plans[m] ?? {};
              const low = Math.min(...(Object.values(o) as number[]));
              return (
                <div className="tr" role="row" key={m}>
                  <span role="cell">{duration(m)}</span>
                  {types.map((t) => <span role="cell" key={t} className="num">{o[t] ? money(o[t]!) : "—"}</span>)}
                  <span role="cell" className="num muted">{money(Math.round(low / Number(m)))}</span>
                </div>
              );
            })}
          </div>
          <p className="foot-note"><span>قیمت‌ها به تومان و نهایی‌اند (داده نمونه).</span></p>
        </div>
      </section>

      <section className="pdp-sec">
        <div className="wrap faq-g">
          <div>
            <Eyebrow>Questions</Eyebrow>
            <h2 className="pdp-h">سؤال‌های<br /><b><span className="en">{p.name}</span></b></h2>
            <div className="concierge"><p>جوابت را پیدا نکردی؟ هر روز ۹ تا ۲۴ در تلگرام.</p><a className="btn btn-ghost" href="#">گفت‌وگو با پشتیبانی <Icon id="arrow" className="arrow" /></a></div>
          </div>
          <div className="faq">
            {faq.map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}<span className="pm" /></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="light pdp-sec">
        <div className="wrap">
          <Eyebrow dotColor="var(--ink)">More passes</Eyebrow>
          <h2 className="pdp-h" style={{ marginBottom: 36 }}>شاید این‌ها هم به کارت بیاید</h2>
          <div className="tiles">
            {related.map((r) => {
              const [t2, tier2] = splitName(r.name);
              return (
                <Link className="tile" key={r.id} href={productHref(r)}>
                  <span className="en tile-maker">{r.maker}</span>
                  <b className="en tile-tool">{t2}{tier2 && <small> {tier2}</small>}</b>
                  <span className="tile-use">{r.use}</span>
                  <span className="tile-foot"><span>از <b className="num">{money(minPrice(r))}</b> تومان</span><Icon id="arrow" className="arrow" style={{ width: 16, height: 16 }} /></span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
