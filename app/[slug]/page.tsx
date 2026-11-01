import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, PRODUCTS, deliveryTypes, minPrice, planKeys, type Product } from "@/lib/catalog";
import { CONTENT, contentOf } from "@/lib/content";
import { fa, money } from "@/lib/format";
import { BrandLogo, Eyebrow, Icon } from "@/components/brand";
import { ToolCard } from "@/components/sections";
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
    [`اشتراک ${p.name} چطور فعال می‌شود؟`, own
      ? `مدت را انتخاب کن و با تومان بپرداز. بعد ایمیل اکانت ${p.maker} خودت را وارد می‌کنی و اشتراک روی همان فعال می‌شود.`
      : "مدت را انتخاب کن و با تومان بپرداز. یک اکانت تازه برایت فعال می‌شود و ایمیل و رمزش را پیامک می‌کنیم."],
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
  const faq = faqFor(p);
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
        { "@type": "ListItem", position: 2, name: CATEGORIES[p.category], item: "https://accdrop.ir/#tools" },
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
            <Link href="/">اک‌دراپ</Link><span>/</span><Link href="/#tools">{CATEGORIES[p.category]}</Link><span>/</span><span className="en">{p.name}</span>
          </nav>
          <BuyPanel product={p}>
            <div className="pdp-head">
              <span className="pdp-brand"><span className="pdp-logo"><BrandLogo id={p.id} size={30} /></span><span className="en">{p.maker}</span></span>
              <h1><span className="sr">خرید اشتراک </span><span className="en pdp-tool">{tool}{tier && <small> {tier}</small>}</span></h1>
              <p className="pdp-use">{p.use}</p>
            </div>
          </BuyPanel>
        </div>
      </section>

      <section className="light pdp-sec">
        <div className="wrap pdp-two">
          <div>
            <Eyebrow dotColor="var(--ink)">What you get</Eyebrow>
            <h2 className="pdp-h">با این اشتراک<br /><b>چه می‌گیری؟</b></h2>
            <p className="pdp-intro">{c.intro}</p>
          </div>
          <div>
            <ul className="pdp-list">{p.includes.map((x, i) => <li key={x}><span className="en k">0{i + 1}</span><span>{x}</span></li>)}</ul>
            <div className="pdp-for"><small>مناسب برای</small><div>{c.forWho.map((w) => <span key={w}>{w}</span>)}</div></div>
          </div>
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
          <Eyebrow dotColor="var(--ink)">More tools</Eyebrow>
          <h2 className="pdp-h" style={{ marginBottom: 36 }}>شاید این‌ها هم به کارت بیاید</h2>
          <div className="tiles">{related.map((r) => <ToolCard key={r.id} p={r} />)}</div>
        </div>
      </section>
    </main>
  );
}
