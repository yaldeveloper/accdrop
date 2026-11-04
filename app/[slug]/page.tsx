import type { Metadata } from "next";
import Link from "next/link";
import type React from "react";
import { Scene } from "@/components/scene";
import { themeOf } from "@/lib/theme";
import { notFound } from "next/navigation";
import { loadCatalog } from "@/lib/server/catalog";
import { CATEGORIES, DELIVERY, PRICES_UPDATED, PRODUCTS, axisOf, deliveryExplain, deliveryTypes, etaText, guaranteeOf, isSub, kindOf, minPrice, nounOf, optionLabel, planKeys, priceOf, type DeliveryType, type Product, deliveryOf } from "@/lib/catalog";
import { seoOf } from "@/lib/seo";
import { Toc } from "@/components/toc";
import { CONTENT, contentOf } from "@/lib/content";
import { fa, money } from "@/lib/format";
import { BrandLogo, Icon } from "@/components/brand";
import { ToolCard } from "@/components/sections";
import { BuyPanel } from "@/components/buy-panel";
import { NumberShop } from "@/components/numbers";
import { Reviews } from "@/components/reviews";
import { splitName } from "@/components/pass";
import { INSTALLMENTS, canInstall } from "@/lib/billing";

export const dynamicParams = true;
export const revalidate = 60;

const bySlug = (slug: string) => PRODUCTS.find((p) => CONTENT[p.id]?.slug === slug);

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: CONTENT[p.id].slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await loadCatalog();
  const p = bySlug((await params).slug);
  if (!p) return {};
  const c = contentOf(p);
  const kw = keywordOf(p);
  const tail = { sub: deliveryTypes(p).includes("username") ? "فعال‌سازی روی آیدی شما" : deliveryTypes(p).includes("code") ? "تحویل فوری و خودکار" : "فعال‌سازی روی ایمیل شما", gift: "کد قانونی از منبع رسمی", account: "اکانت اختصاصی", qty: "تحویل روی آیدی شما", number: "کد تأیید در پنل" }[kindOf(p)];
  const title = `${kw.includes(c.faName) ? kw : `${kw} (${c.faName})`} | ${tail}`;
  const description = `${kw} با پرداخت تومانی، از ${money(minPrice(p))} تومان. تحویل ${etaText(p)}، ${DELIVERY[deliveryTypes(p)[0]].detail}؛ ضمانت بازگشت وجه و پشتیبانی فارسی.`;
  return {
    title, description,
    alternates: { canonical: `/${c.slug}` },
    openGraph: { title, description, url: `/${c.slug}`, type: "website", locale: "fa_IR", siteName: "AccDrop" },
  };
}

const keywordOf = (p: Product) => contentOf(p).keyword ?? `خرید اکانت ${p.name}`;

/** The three steps of one delivery method. */
function stepsFor(p: Product, t: DeliveryType): [string, string][] {
  const pay: [string, string] = ["پرداخت", `${axisOf(p)} را انتخاب کن و با کارت بانکی بپرداز.`];
  switch (t) {
    case "own": return [pay, ["ایمیل اکانت", `ایمیل اکانت ${p.maker} خودت را وارد کن. رمز لازم نیست.`], [`فعال‌سازی، ${etaText(p)}`, "اشتراک روی همان اکانت فعال می‌شود و پیامک می‌گیری."]];
    case "ready": return [pay, ["ساخت اکانت", "یک اکانت تازه فقط برای تو ساخته می‌شود."], [`تحویل، ${etaText(p)}`, "اطلاعات ورود را در حساب کاربری و پیامک می‌بینی."]];
    case "username": return [pay, ["یوزرنیم تلگرام", "آیدی خودت یا کسی که می‌خواهی هدیه بگیرد را وارد کن."], [`ارسال، ${etaText(p)}`, "روی همان آیدی فعال می‌شود و پیامک می‌گیری."]];
    case "code": return [pay, ["دریافت فوری", "کد یا اطلاعات ورود در صفحه سفارش و پیامک نمایش داده می‌شود."],
      [kindOf(p) === "gift" ? "وارد کردن کد" : "فعال‌سازی", p.howTo ?? `کد را روی اکانت ${p.maker} خودت وارد کن.`]];
    case "number": return [pay, ["دریافت شماره", "شماره در صفحه سفارش نمایش داده می‌شود."], ["دریافت کد تأیید", "شماره را در تلگرام یا واتس‌اپ بزن؛ کد همان‌جا می‌آید."]];
  }
}

function promisesFor(p: Product): [string, string][] {
  const tail: [string, string] = ["قیمت همان است که می‌بینی.", "بدون کارمزد پنهان، به تومان و نهایی."];
  switch (kindOf(p)) {
    case "sub": if (deliveryTypes(p).every((t) => t === "code")) return [["کد یا اکانت کار نکرد؟", "جایگزین می‌کنیم یا کل مبلغ برمی‌گردد."], ["تحویل همان لحظه.", "بعد از پرداخت، خودکار در حساب کاربری و پیامک."], ["گارانتی", guaranteeOf(p) + "."], tail];
      return [["فعال نشد؟", "کل مبلغ را برمی‌گردانیم."], ["وسط دوره قطع شد؟", "ظرف ۲۴ ساعت جایگزین می‌کنیم؛ اگر نشد، مبلغ روزهای باقی‌مانده برمی‌گردد."], ["رمز عبورت امن است.", "هیچ‌وقت رمز عبور نمی‌خواهیم."], tail];
    case "gift": return [["کد کار نکرد؟", "کد جایگزین یا بازگشت کامل وجه."], ["از منبع رسمی.", "کدها قانونی‌اند، نه کارت‌های دست‌دوم."], ["تحویل در حساب کاربری.", "کد در صفحه سفارش و پیامک."], tail];
    case "account": return [["ورود نشد؟", "اکانت جایگزین یا بازگشت وجه."], ["فقط مال توست.", "اکانت با کسی به اشتراک گذاشته نمی‌شود و رمز را عوض می‌کنی."], ["اطلاعات کامل.", "ایمیل، رمز و سؤال‌های امنیتی را تحویل می‌گیری."], tail];
    case "qty": return [["کامل نرسید؟", "باقی‌مانده را می‌فرستیم یا مبلغش را برمی‌گردانیم."], ["امن.", "فقط یوزرنیم؛ هرگز کد ورود تلگرام نمی‌خواهیم."], ["هدیه هم می‌شود.", "روی آیدی هر کسی که بخواهی."], tail];
    case "number": return [["کد نیامد؟", "شماره جدید می‌گیری یا کل مبلغ برمی‌گردد."], ["کد تأیید در پنل.", "کد پیامکی همان‌جا نمایش داده می‌شود."], ["کشور به انتخاب تو.", "آمریکا، انگلیس، کانادا یا هلند."], tail];
  }
}

function faqFor(p: Product): [string, string][] {
  const pay: [string, string] = ["پرداخت چطور انجام می‌شود؟", "با هر کارت بانکی عضو شتاب، از درگاه پرداخت رسمی و به تومان. نیازی به کارت ارزی یا حساب خارجی نیست."];
  if (!isSub(p) || deliveryTypes(p).includes("username")) {
    return [
      [`بعد از پرداخت، ${p.name} چقدر طول می‌کشد؟`, p.etaMinutes === 0 ? "تحویل خودکار است و بعد از پرداخت در صفحه سفارش و حساب کاربری‌ات نمایش داده می‌شود." : `معمولاً ${etaText(p)}. وضعیت سفارش را لحظه‌به‌لحظه در حساب کاربری‌ات می‌بینی و پیامک می‌گیری.`],
      ["اگر مشکلی پیش آمد چه می‌شود؟", `ضمانت ما: ${guaranteeOf(p)}. پشتیبانی فارسی هر روز ۹ تا ۲۴ پاسخ می‌دهد.`],
      pay,
    ];
  }
  const own = deliveryTypes(p).includes("own"), ready = deliveryTypes(p).includes("ready");
  return [
    [`بعد از پرداخت، ${p.name} چقدر طول می‌کشد تا فعال شود؟`, p.etaMinutes === 0 ? "بلافاصله و خودکار، حتی نیمه‌شب. همان لحظه بعد از پرداخت، تحویلی در صفحه سفارش و حساب کاربری‌ات نمایش داده و پیامک می‌شود." : `معمولاً حدود ${fa(p.etaMinutes)} دقیقه. وضعیت سفارش را لحظه‌به‌لحظه در حساب کاربری‌ات می‌بینی و وقتی فعال شد پیامک می‌گیری. ساعت کاری فعال‌سازی ۹ صبح تا ۱۲ شب است؛ سفارش‌های بعد از آن صبح روز بعد انجام می‌شوند.`],
    ...(p.howTo ? [["بعد از تحویل چطور فعالش کنم؟", p.howTo] as [string, string]] : []),
    ...(own ? [[`برای فعال‌سازی روی ایمیل خودم چه چیزی لازم است؟`, `فقط ایمیلی که با آن در ${p.maker} ثبت‌نام کرده‌ای. هیچ‌وقت رمز عبورت را نمی‌خواهیم. اگر هنوز اکانت نداری، اول با همان ایمیل در سایت ${p.maker} ثبت‌نام کن.`] as [string, string]] : []),
    ...(ready ? [["«اکانت آماده» یعنی چه؟", "یک اکانت تازه که فقط مال توست و با کسی به اشتراک گذاشته نمی‌شود. ایمیل و رمزش را در حساب کاربری و پیامک تحویل می‌گیری و می‌توانی رمز را عوض کنی."] as [string, string]] : []),
    ["آیا از داخل ایران قابل استفاده است؟", `${p.maker} کاربران ایران را محدود کرده است، پس برای استفاده به اینترنت بدون محدودیت نیاز داری. بعد از خرید، راهنمای قدم‌به‌قدم استفاده را برایت می‌فرستیم.`],
    p.warranty ? ["اگر کد یا اکانت کار نکرد چه می‌شود؟", `اگر تحویلی سالم نبود، جایگزین می‌کنیم یا کل مبلغ برمی‌گردد. گارانتی این محصول: ${p.warranty}.`]
      : ["اگر اشتراک فعال نشد یا وسط دوره قطع شد چه می‌شود؟", "اگر به هر دلیلی فعال نشد، کل مبلغ برمی‌گردد. اگر وسط دوره قطع شد، ظرف ۲۴ ساعت جایگزین می‌کنیم و اگر ممکن نبود، مبلغ روزهای باقی‌مانده را برمی‌گردانیم."],
    ["پرداخت چطور انجام می‌شود؟", "با هر کارت بانکی عضو شتاب، از درگاه پرداخت رسمی و به تومان. نیازی به کارت ارزی یا حساب خارجی نیست."],
    ["تمدید چطور است؟", "چند روز قبل از تمام شدن، پیامک یادآوری می‌گیری و از حساب کاربری‌ات با یک کلیک تمدید می‌کنی."],
  ];
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  await loadCatalog();
  const p = bySlug((await params).slug);
  if (!p) notFound();
  const c = contentOf(p);
  const [tool, tier] = splitName(p.name);
  const instant = p.etaMinutes === 0 && deliveryTypes(p).every((t) => t === "code");
  const months = planKeys(p);
  const seo = seoOf(p.id);
  const faq = [...(seo?.faq ?? []), ...faqFor(p)];
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).concat(PRODUCTS.filter((x) => x.category !== p.category)).slice(0, 4);
  const prices = months.flatMap((m) => Object.values(p.plans[m] ?? {}) as number[]);

  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Product",
      name: c.faName ? `${p.name} (${c.faName})` : p.name, description: c.intro, brand: { "@type": "Brand", name: p.maker }, sku: c.slug,
      offers: {
        "@type": "AggregateOffer", priceCurrency: "IRR", lowPrice: Math.min(...prices) * 10, highPrice: Math.max(...prices) * 10,
        offerCount: prices.length, availability: "https://schema.org/InStock", url: `https://accdrop.ir/${c.slug}`,
        seller: { "@type": "Organization", name: "AccDrop" },
        offers: months.flatMap((m) => deliveryTypes(p).filter((t) => p.plans[m]?.[t]).map((t) => ({
          "@type": "Offer", name: `${p.name}، ${optionLabel(p, m)}، ${deliveryOf(p, t).title}`, priceCurrency: "IRR",
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
      "@context": "https://schema.org", "@type": "WebPage", name: keywordOf(p), inLanguage: "fa-IR",
      dateModified: PRICES_UPDATED.iso, url: `https://accdrop.ir/${c.slug}`,
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  const types = deliveryTypes(p);
  return (
    <main className={`pdp2 pt-${themeOf(p.id).motif}`} style={{ "--b": themeOf(p.id).c, "--b2": themeOf(p.id).c2 } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {kindOf(p) === "number" ? (
        <section className="p2-top vn-top-s">
          <div className="wrap">
            <nav className="crumbs" aria-label="مسیر">
              <Link href="/">اک‌دراپ</Link><span>/</span><span>{CATEGORIES[p.category]}</span>
            </nav>
            <h1 className="vn-h1">خرید شماره مجازی</h1>
            <p className="vn-lead">سرویس و کشور را انتخاب کن، پرداخت کن، شماره و کد تأیید را همین‌جا بگیر. کد نیامد؟ پولت برمی‌گردد.</p>
            <NumberShop product={p} />
          </div>
        </section>
      ) : <section className="p2-top">
        <div className="wrap">
          <nav className="crumbs" aria-label="مسیر">
            <Link href="/">اک‌دراپ</Link><span>/</span><Link href={`/services?c=${p.category}`}>{CATEGORIES[p.category]}</Link><span>/</span><span className="en">{p.name}</span>
          </nav>
          <div className="p2-g">
            <div className="p2-info p2-head">
              <div className="p2-brand"><span className="p2-logo"><BrandLogo id={p.id} size={30} /></span><div><small>{c.prefix ?? "خرید اکانت"} • {isSub(p) ? "اشتراک رسمی" : "رسمی و قانونی"}</small><b className="en">{p.maker}</b></div></div>
              <h1 className="p2-h1"><span className="en">{tool}{tier && <i> {tier}</i>}</span></h1>
              <p className="p2-use">{p.use}</p>
              <p className="p2-lead">{c.intro}</p>
              <ul className="p2-hl">{p.includes.slice(0, 3).map((x) => <li key={x}><Icon id="check" />{x}</li>)}</ul>
              <ul className="p2-perks" aria-label="مزایای خرید از اک‌دراپ">
                <li><span className="p2-pi"><Icon id="shield" /></span><span><b>{isSub(p) && !p.warranty ? "ضمانت تا روز آخر" : guaranteeOf(p)}</b><small>{isSub(p) && !p.warranty ? "اگر قطع شد، روزهای باقی‌مانده برمی‌گردد" : "جایگزینی یا بازگشت کامل وجه"}</small></span></li>
                <li><span className="p2-pi"><Icon id="user" /></span><span><b>{instant ? "تحویل فوری و خودکار" : isSub(p) ? "روی اکانت خودت" : "تحویل در حساب کاربری"}</b><small>{instant ? "همان لحظه، در حساب کاربری و پیامک" : isSub(p) ? "فقط ایمیل؛ رمز نمی‌خواهیم" : "همراه با پیامک"}</small></span></li>
                {canInstall(Math.max(...planKeys(p).map((m) => priceOf({ id: p.id, plan: m, type: Object.keys(p.plans[m] ?? {})[0] as DeliveryType }).price))) && (
                  <li><span className="p2-pi sp"><img src="/pay/snapppay.svg" alt="" width={36} height={36} /></span><span><b>{fa(INSTALLMENTS.parts)} قسط بدون کارمزد</b><small>با اسنپ‌پی، بدون ضامن</small></span></li>
                )}
                {p.group?.length ? <li><a href="#buy" className="p2-pl"><span className="p2-pi"><Icon id="box" /></span><span><b>دنگی با دوستان</b><small>هر نفر تا {fa(p.group[p.group.length - 1][1])}٪ ارزان‌تر</small></span></a></li> : null}
              </ul>
            </div>
            <BuyPanel product={p} />
            <div className="p2-info p2-more">
              <Scene id={p.id} />
            </div>
          </div>
        </div>
      </section>}

      <Toc items={[
        ...(seo ? [["about", "معرفی"], ["features", "امکانات"]] as [string, string][] : []),
        ["prices", "قیمت‌ها"], ["delivery", "نحوه تحویل"],
        ...(seo?.freeVsPaid.length ? [["free-vs-paid", "رایگان یا پولی"]] as [string, string][] : []),
        ["guarantee", "ضمانت"], ["reviews", "نظرات"], ["faq", "سؤالات"],
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
                  <div><dt>نوع</dt><dd>{isSub(p) ? "اشتراک رسمی" : `${nounOf(p)}، رسمی و قانونی`}</dd></div>
                  <div><dt>{axisOf(p).replace(" (آمریکا)", "")}</dt><dd>{months.map((m) => optionLabel(p, m)).join("، ")}</dd></div>
                  <div><dt>روش تحویل</dt><dd>{types.map((t) => deliveryOf(p, t).title).join("، ")}</dd></div>
                  <div><dt>زمان تحویل</dt><dd>{etaText(p)}</dd></div>
                  <div><dt>پلتفرم‌ها</dt><dd>{seo.platforms.join("، ")}</dd></div>
                  <div><dt>شروع قیمت</dt><dd><b>{money(minPrice(p))}</b> تومان</dd></div>
                  <div><dt>ضمانت</dt><dd>{guaranteeOf(p)}</dd></div>
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
              <h2>قیمت {keywordOf(p)}</h2>
              <p>قیمت‌ها به تومان و نهایی‌اند؛ بدون کارمزد و هزینه پنهان. پرداخت با همه کارت‌های بانکی عضو شتاب.</p>
              <p className="p2-upd"><Icon id="clock" />به‌روزرسانی قیمت: <time dateTime={PRICES_UPDATED.iso}>{PRICES_UPDATED.fa}</time></p>
            </div>
            <div className="p2-tbl-w">
              <table className="p2-tbl">
                <caption className="sr">جدول قیمت {p.name}</caption>
                <thead><tr><th scope="col">{axisOf(p)}</th>{types.map((t) => <th scope="col" key={t}>{deliveryOf(p, t).title}</th>)}</tr></thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m}>
                      <th scope="row">{optionLabel(p, m)}</th>
                      {types.map((t) => {
                        if (!p.plans[m]?.[t]) return <td key={t} className="na">ندارد</td>;
                        const pr = priceOf({ id: p.id, plan: m, type: t });
                        return (
                          <td key={t}>
                            <b>{money(pr.price)}</b> <small>تومان</small>
                            {pr.was && <><s>{money(pr.was)}</s><span className="p2-drop">دراپ هفته</span></>}
                            {isSub(p) && Number(m) > 1 && <em>ماهی {money(Math.round(pr.price / Number(m) / 1000) * 1000)}</em>}
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
                  <h3>{deliveryOf(p, t).title}{t === "own" && types.length > 1 && <span className="p2-rec">پیشنهاد ما</span>}</h3>
                  <p>{deliveryExplain(p, t)}</p>
                  <ol>{stepsFor(p, t).map(([b, d]) => <li key={b}><b>{b}</b><span>{d}</span></li>)}</ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        {seo && seo.freeVsPaid.length > 0 && (
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
            <div className="p2-h"><span className="p2-k">ضمانت</span><h2>ضمانت اک‌دراپ</h2><p>{isSub(p) ? "اشتراکی که می‌خری تا روز آخر بیمه است." : "هر خرید ضمانت مشخص دارد."} این‌ها تعهد ماست، نه شعار.</p><Link className="link" href="/guarantee">شرایط کامل ضمانت</Link></div>
            <ul className="p2-promise">
              {promisesFor(p).map(([b, d]) => <li key={b}><b>{b}</b><span>{d}</span></li>)}
            </ul>
          </div>
        </section>

        <section className="p2-sec" id="compare">
          <div className="wrap p2-two">
            <div className="p2-h"><span className="p2-k">مقایسه</span><h2>خرید مستقیم یا اک‌دراپ؟</h2><p>همان {nounOf(p)} رسمی <span className="en">{p.maker === "AccDrop" ? "" : p.maker}</span>، بدون دردسر کارت ارزی.</p></div>
            <div className="cmp" role="table" aria-label="مقایسه">
              <div className="cmp-r cmp-h" role="row"><span role="columnheader" /><span role="columnheader">خرید مستقیم</span><span role="columnheader">اک‌دراپ</span></div>
              {([
                ["پرداخت", "کارت ارزی بین‌المللی", "کارت بانکی، به تومان"],
                ["قیمت", "دلاری، با کارمزد و نوسان", "تومانی و نهایی"],
                ["شروع", "حساب و آدرس خارجی لازم است", etaText(p)],
                ["ضمانت", "ندارد", guaranteeOf(p)],
                ["پشتیبانی", "ایمیلی، انگلیسی", "فارسی و انسانی"],
              ] as const).map(([k, a, b]) => (
                <div className="cmp-r" role="row" key={k}><span role="cell" className="muted">{k}</span><span role="cell" className="muted">{a}</span><span role="cell"><Icon id="check" />{b}</span></div>
              ))}
            </div>
          </div>
        </section>

        <Reviews productId={p.id} name={p.name} />

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
