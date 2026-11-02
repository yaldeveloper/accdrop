import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, DELIVERY, PRICES_UPDATED, PRODUCTS, deliveryExplain, deliveryTypes, minPrice, planKeys, priceOf, type Product } from "@/lib/catalog";
import { seoOf } from "@/lib/seo";
import { Toc } from "@/components/toc";
import { CONTENT, contentOf } from "@/lib/content";
import { duration, fa, money } from "@/lib/format";
import { BrandLogo, Icon } from "@/components/brand";
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
  const title = `خرید اکانت ${p.name} (${c.faName}) | فعال‌سازی روی ایمیل شما`;
  const description = `خرید اکانت ${p.name} با تحویل فوری و تومان، از ${money(minPrice(p))} تومان. فعال‌سازی روی ایمیل خودت در حدود ${fa(p.etaMinutes)} دقیقه، ضمانت بازگشت وجه و پشتیبانی فارسی.`;
  return {
    title, description,
    alternates: { canonical: `/${c.slug}` },
    openGraph: { title, description, url: `/${c.slug}`, type: "website", locale: "fa_IR", siteName: "AccDrop" },
  };
}

function faqFor(p: Product): [string, string][] {
  const own = deliveryTypes(p).includes("own"), ready = deliveryTypes(p).includes("ready");
  return [
    [`بعد از پرداخت، ${p.name} چقدر طول می‌کشد تا فعال شود؟`, `معمولاً حدود ${fa(p.etaMinutes)} دقیقه. وضعیت سفارش را لحظه‌به‌لحظه در حساب کاربری‌ات می‌بینی و وقتی فعال شد پیامک می‌گیری. ساعت کاری فعال‌سازی ۹ صبح تا ۱۲ شب است؛ سفارش‌های بعد از آن صبح روز بعد انجام می‌شوند.`],
    ...(own ? [[`برای فعال‌سازی روی ایمیل خودم چه چیزی لازم است؟`, `فقط ایمیلی که با آن در ${p.maker} ثبت‌نام کرده‌ای. هیچ‌وقت رمز عبورت را نمی‌خواهیم. اگر هنوز اکانت نداری، اول با همان ایمیل در سایت ${p.maker} ثبت‌نام کن.`] as [string, string]] : []),
    ...(ready ? [["«اکانت آماده» یعنی چه؟", "یک اکانت تازه که فقط مال توست و با کسی به اشتراک گذاشته نمی‌شود. ایمیل و رمزش را در حساب کاربری و پیامک تحویل می‌گیری و می‌توانی رمز را عوض کنی."] as [string, string]] : []),
    ["آیا از داخل ایران قابل استفاده است؟", `${p.maker} کاربران ایران را محدود کرده است، پس برای استفاده به اینترنت بدون محدودیت نیاز داری. بعد از خرید، راهنمای قدم‌به‌قدم استفاده را برایت می‌فرستیم.`],
    ["اگر اشتراک فعال نشد یا وسط دوره قطع شد چه می‌شود؟", "اگر به هر دلیلی فعال نشد، کل مبلغ برمی‌گردد. اگر وسط دوره قطع شد، ظرف ۲۴ ساعت جایگزین می‌کنیم و اگر ممکن نبود، مبلغ روزهای باقی‌مانده را برمی‌گردانیم."],
    ["پرداخت چطور انجام می‌شود؟", "با هر کارت بانکی عضو شتاب، از درگاه پرداخت رسمی و به تومان. نیازی به کارت ارزی یا حساب خارجی نیست."],
    ["تمدید چطور است؟", "چند روز قبل از تمام شدن، پیامک یادآوری می‌گیری و از حساب کاربری‌ات با یک کلیک تمدید می‌کنی."],
  ];
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = bySlug((await params).slug);
  if (!p) notFound();
  const c = contentOf(p);
  const [tool, tier] = splitName(p.name);
  const months = planKeys(p);
  const seo = seoOf(p.id);
  const faq = [...(seo?.faq ?? []), ...faqFor(p)];
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).concat(PRODUCTS.filter((x) => x.category !== p.category)).slice(0, 4);
  const prices = months.flatMap((m) => Object.values(p.plans[m] ?? {}) as number[]);

  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Product",
      name: `اکانت ${p.name}`, description: c.intro, brand: { "@type": "Brand", name: p.maker }, sku: c.slug,
      offers: {
        "@type": "AggregateOffer", priceCurrency: "IRR", lowPrice: Math.min(...prices) * 10, highPrice: Math.max(...prices) * 10,
        offerCount: prices.length, availability: "https://schema.org/InStock", url: `https://accdrop.ir/${c.slug}`,
        seller: { "@type": "Organization", name: "AccDrop" },
        offers: months.flatMap((m) => deliveryTypes(p).filter((t) => p.plans[m]?.[t]).map((t) => ({
          "@type": "Offer", name: `${p.name}، ${duration(m)}، ${DELIVERY[t].title}`, priceCurrency: "IRR",
          price: priceOf({ id: p.id, plan: m, type: t }).price * 10, availability: "https://schema.org/InStock",
          url: `https://accdrop.ir/${c.slug}?plan=${m}&type=${t}`,
        }))),
      },
      category: CATEGORIES[p.category],
      ...(seo ? { additionalProperty: [{ "@type": "PropertyValue", name: "پلتفرم‌ها", value: seo.platforms.join("، ") }] } : {}),
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
      "@context": "https://schema.org", "@type": "WebPage", name: `خرید اکانت ${p.name}`, inLanguage: "fa-IR",
      dateModified: PRICES_UPDATED.iso, url: `https://accdrop.ir/${c.slug}`,
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  const types = deliveryTypes(p);
  return (
    <main className="pdp2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="p2-top">
        <div className="wrap">
          <nav className="crumbs" aria-label="مسیر">
            <Link href="/">اک‌دراپ</Link><span>/</span><Link href="/#collection">{CATEGORIES[p.category]}</Link><span>/</span><span className="en">{p.name}</span>
          </nav>
          <div className="p2-g">
            <div className="p2-info p2-head">
              <div className="p2-brand"><span className="p2-logo"><BrandLogo id={p.id} size={30} /></span><div><small>اشتراک رسمی</small><b className="en">{p.maker}</b></div></div>
              <h1><small>خرید اکانت</small><span className="en">{tool}{tier && <i> {tier}</i>}</span></h1>
              <p className="p2-lead">{c.intro}</p>
            </div>
            <BuyPanel product={p} />
            <div className="p2-info p2-more">
              <div className="p2-incl">
                <h2>با این اشتراک</h2>
                <ul>{p.includes.map((x) => <li key={x}><Icon id="check" />{x}</li>)}</ul>
              </div>
              <ul className="p2-facts">
                <li><Icon id="clock" /><div><b>حدود {fa(p.etaMinutes)} دقیقه</b><small>تحویل بعد از پرداخت</small></div></li>
                <li><Icon id="shield" /><div><b>ضمانت تا روز آخر</b><small>جایگزینی یا بازگشت وجه</small></div></li>
                <li><Icon id="chat" /><div><b>پشتیبانی فارسی</b><small>هر روز ۹ تا ۲۴</small></div></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Toc items={[
        ...(seo ? [["about", "معرفی"], ["features", "امکانات"]] as [string, string][] : []),
        ["prices", "قیمت‌ها"], ["delivery", "نحوه تحویل"],
        ...(seo ? [["free-vs-paid", "رایگان یا پولی"]] as [string, string][] : []),
        ["guarantee", "ضمانت"], ["compare", "چرا اک‌دراپ"], ["faq", "سؤالات"],
      ]} />

      <div className="light p2-body">
        {seo && (
          <section className="p2-sec" id="about">
            <div className="wrap p2-two">
              <div className="p2-prose">
                <span className="p2-k">معرفی</span>
                <h2>{p.name} چیست و به درد چه کسی می‌خورد؟</h2>
                {seo.about.map((t) => <p key={t}>{t}</p>)}
                <h3>مناسب برای</h3>
                <ul className="p2-who">{c.forWho.map((w) => <li key={w}><Icon id="check" />{w}</li>)}</ul>
              </div>
              <aside className="p2-spec" aria-label="مشخصات">
                <h3>مشخصات اشتراک</h3>
                <dl>
                  <div><dt>سرویس</dt><dd className="en">{p.name}</dd></div>
                  <div><dt>سازنده</dt><dd className="en">{p.maker}</dd></div>
                  <div><dt>دسته</dt><dd>{CATEGORIES[p.category]}</dd></div>
                  <div><dt>نوع</dt><dd>اشتراک رسمی</dd></div>
                  <div><dt>مدت</dt><dd>{months.map(duration).join("، ")}</dd></div>
                  <div><dt>روش تحویل</dt><dd>{types.map((t) => DELIVERY[t].title).join("، ")}</dd></div>
                  <div><dt>زمان تحویل</dt><dd>حدود {fa(p.etaMinutes)} دقیقه</dd></div>
                  <div><dt>پلتفرم‌ها</dt><dd>{seo.platforms.join("، ")}</dd></div>
                  <div><dt>شروع قیمت</dt><dd><b>{money(minPrice(p))}</b> تومان</dd></div>
                  <div><dt>ضمانت</dt><dd>تا روز آخر اشتراک</dd></div>
                </dl>
              </aside>
            </div>
          </section>
        )}

        {seo && (
          <section className="p2-sec" id="features">
            <div className="wrap">
              <div className="p2-h p2-hw"><span className="p2-k">امکانات</span><h2>با اشتراک {p.name} چه چیزهایی باز می‌شود؟</h2></div>
              <div className="p2-feat">
                {seo.features.map(([t, d], i) => (
                  <div key={t}><span className="p2-n">{fa(String(i + 1).padStart(2, "0"))}</span><h3>{t}</h3><p>{d}</p></div>
                ))}
              </div>
              <h3 className="p2-sub">کاربردهای رایج</h3>
              <div className="p2-uses">
                {seo.uses.map(([t, d]) => <div key={t}><b>{t}</b><span>{d}</span></div>)}
              </div>
            </div>
          </section>
        )}

        <section className="p2-sec" id="prices">
          <div className="wrap p2-two">
            <div className="p2-h">
              <span className="p2-k">قیمت</span>
              <h2>قیمت خرید اکانت {p.name}</h2>
              <p>قیمت‌ها به تومان و نهایی‌اند؛ بدون کارمزد و هزینه پنهان. پرداخت با همه کارت‌های بانکی عضو شتاب.</p>
              <p className="p2-upd"><Icon id="clock" />به‌روزرسانی قیمت: <time dateTime={PRICES_UPDATED.iso}>{PRICES_UPDATED.fa}</time></p>
            </div>
            <div className="p2-tbl-w">
              <table className="p2-tbl">
                <caption className="sr">جدول قیمت {p.name}</caption>
                <thead><tr><th scope="col">مدت</th>{types.map((t) => <th scope="col" key={t}>{DELIVERY[t].title}</th>)}</tr></thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m}>
                      <th scope="row">{duration(m)}</th>
                      {types.map((t) => {
                        if (!p.plans[m]?.[t]) return <td key={t} className="na">ندارد</td>;
                        const pr = priceOf({ id: p.id, plan: m, type: t });
                        return (
                          <td key={t}>
                            <b>{money(pr.price)}</b> <small>تومان</small>
                            {pr.was && <><s>{money(pr.was)}</s><span className="p2-drop">دراپ هفته</span></>}
                            {Number(m) > 1 && <em>ماهی {money(Math.round(pr.price / Number(m) / 1000) * 1000)}</em>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="p2-sec" id="delivery">
          <div className="wrap p2-two">
            <div className="p2-h"><span className="p2-k">تحویل</span><h2>تحویل {p.name} چطور انجام می‌شود؟</h2><p>{types.length > 1 ? "دو روش داریم. هر کدام را که در کادر خرید انتخاب کنی، همان‌طور تحویل می‌گیری." : "ساده و بدون نیاز به رمز عبور."}</p></div>
            <div className="p2-ways">
              {types.map((t) => (
                <div className="p2-way" key={t}>
                  <h3>{DELIVERY[t].title}{t === "own" && types.length > 1 && <span className="p2-rec">پیشنهاد ما</span>}</h3>
                  <p>{deliveryExplain(p, t)}</p>
                  <ol>
                    <li><b>پرداخت</b><span>مدت را انتخاب کن و با کارت بانکی بپرداز.</span></li>
                    {t === "own"
                      ? <li><b>ایمیل اکانت</b><span>ایمیل اکانت <span className="en">{p.maker}</span> خودت را وارد کن. رمز لازم نیست.</span></li>
                      : <li><b>ساخت اکانت</b><span>یک اکانت تازه فقط برای تو ساخته می‌شود.</span></li>}
                    <li><b>فعال‌سازی، حدود {fa(p.etaMinutes)} دقیقه</b><span>{t === "own" ? "اشتراک روی همان اکانت فعال می‌شود و پیامک می‌گیری." : "ایمیل و رمز را در حساب کاربری و پیامک می‌بینی."}</span></li>
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        {seo && (
          <section className="p2-sec" id="free-vs-paid">
            <div className="wrap p2-two">
              <div className="p2-h">
                <span className="p2-k">مقایسه</span>
                <h2>{p.name} یا نسخه رایگان؟</h2>
                <p>نسخه رایگان برای امتحان خوب است؛ برای کار روزمره و جدی، تفاوت را همین جدول نشان می‌دهد.</p>
                <div className="p2-plat"><small>در دسترس روی</small>{seo.platforms.map((x) => <span key={x}>{x}</span>)}</div>
              </div>
              <div className="p2-tbl-w">
                <table className="p2-tbl p2-fvp">
                  <caption className="sr">مقایسه نسخه رایگان و {p.name}</caption>
                  <thead><tr><th scope="col" /><th scope="col">رایگان</th><th scope="col" className="hi">{p.name}</th></tr></thead>
                  <tbody>{seo.freeVsPaid.map(([k, a, b]) => <tr key={k}><th scope="row">{k}</th><td>{a}</td><td className="hi"><Icon id="check" />{b}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className="p2-sec" id="guarantee">
          <div className="wrap p2-two">
            <div className="p2-h"><span className="p2-k">ضمانت</span><h2>ضمانت اک‌دراپ</h2><p>اشتراکی که می‌خری تا روز آخر بیمه است. این‌ها تعهد ماست، نه شعار.</p><Link className="link" href="/guarantee">شرایط کامل ضمانت</Link></div>
            <ul className="p2-promise">
              <li><b>فعال نشد؟</b><span>کل مبلغ را برمی‌گردانیم.</span></li>
              <li><b>وسط دوره قطع شد؟</b><span>ظرف ۲۴ ساعت جایگزین می‌کنیم؛ اگر نشد، مبلغ روزهای باقی‌مانده برمی‌گردد.</span></li>
              <li><b>رمز عبورت امن است.</b><span>برای فعال‌سازی روی ایمیل خودت، هیچ‌وقت رمز نمی‌خواهیم.</span></li>
              <li><b>قیمت همان است که می‌بینی.</b><span>بدون کارمزد پنهان، به تومان و نهایی.</span></li>
            </ul>
          </div>
        </section>

        <section className="p2-sec" id="compare">
          <div className="wrap p2-two">
            <div className="p2-h"><span className="p2-k">مقایسه</span><h2>خرید مستقیم یا اک‌دراپ؟</h2><p>همان اشتراک رسمی <span className="en">{p.maker}</span>، بدون دردسر کارت ارزی.</p></div>
            <div className="cmp" role="table" aria-label="مقایسه">
              <div className="cmp-r cmp-h" role="row"><span role="columnheader" /><span role="columnheader">خرید مستقیم</span><span role="columnheader">اک‌دراپ</span></div>
              {([
                ["پرداخت", "کارت ارزی بین‌المللی", "کارت بانکی، به تومان"],
                ["قیمت", "دلاری، با کارمزد و نوسان", "تومانی و نهایی"],
                ["شروع", "حساب و آدرس خارجی لازم است", `حدود ${fa(p.etaMinutes)} دقیقه`],
                ["ضمانت", "ندارد", "تا روز آخر اشتراک"],
                ["پشتیبانی", "ایمیلی، انگلیسی", "فارسی و انسانی"],
              ] as const).map(([k, a, b]) => (
                <div className="cmp-r" role="row" key={k}><span role="cell" className="muted">{k}</span><span role="cell" className="muted">{a}</span><span role="cell"><Icon id="check" />{b}</span></div>
              ))}
            </div>
          </div>
        </section>

        <section className="p2-sec" id="faq">
          <div className="wrap p2-two">
            <div className="p2-h">
              <span className="p2-k">پرسش و پاسخ</span>
              <h2>سؤالات پرتکرار خرید {p.name}</h2>
              <p>جوابت را پیدا نکردی؟ یک آدم واقعی جواب می‌دهد.</p>
              <a className="btn btn-ink" href="#">پیام در تلگرام <Icon id="arrow" className="arrow" /></a>
            </div>
            <div className="faq faq-l">
              {faq.map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}<span className="pm" /></summary><p>{a}</p></details>)}
            </div>
          </div>
        </section>

        <section className="p2-sec">
          <div className="wrap">
            <div className="p2-h p2-hw"><span className="p2-k">پیشنهاد</span><h2>ابزارهای مشابه {p.name}</h2></div>
            <div className="tiles">{related.map((r) => <ToolCard key={r.id} p={r} />)}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
