import type { Metadata } from "next";
import Link from "next/link";
import { MAX_SEATS, PRODUCTS, groupOff, minPrice } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { fa, money } from "@/lib/format";
import { loadCatalog } from "@/lib/server/catalog";
import { BrandLogo, Icon } from "@/components/brand";

export const metadata: Metadata = {
  title: "خرید گروهی اشتراک ChatGPT و ابزارهای هوش مصنوعی",
  description: "با دوستان یا همکارانت گروهی بخر و برای هر نفر تا ۱۲٪ کمتر بپرداز. هر نفر اشتراک جدا روی ایمیل خودش.",
  alternates: { canonical: "/group" },
};

export default async function GroupPage() {
  await loadCatalog();
  const items = PRODUCTS.filter((p) => p.group?.length);
  const ex = items.find((p) => p.id === "chatgpt") ?? items[0];
  const exUnit = ex ? minPrice(ex) : 0;
  return (
    <main className="grp">
      <section className="grp-top">
        <div className="wrap">
          <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><span>خرید گروهی</span></nav>
          <h1>با هم بخرید،<br /><b>هر نفر ارزان‌تر.</b></h1>
          <p className="grp-lead">دنگی بخرید: یک گروه بساز، لینکش را در گروه تلگرام بفرست و هر نفر فقط سهم خودش را بدهد. لازم نیست کسی پول جمع کند. هر نفر یک اشتراک جدا و شخصی روی ایمیل خودش می‌گیرد؛ هیچ اکانتی اشتراکی نیست.</p>
          <ol className="grp-tiers">
            {(ex?.group ?? []).map(([n, o]) => (
              <li key={n}><b className="num">{fa(o)}٪</b><span>از {fa(n)} نفر به بالا</span></li>
            ))}
          </ol>
        </div>
      </section>

      <div className="light">
        <section className="wrap grp-sec">
          <h2>چطور کار می‌کند؟</h2>
          <ol className="grp-steps">
            <li><span className="num">۱</span><b>گروه را بساز</b><p>در صفحه سرویس «خرید گروهی» و بعد «دنگی» را بزن و تعداد نفرات را تا {fa(MAX_SEATS)} نفر انتخاب کن. قیمت هر نفر از همین لحظه تا ۷۲ ساعت قفل می‌شود.</p></li>
            <li><span className="num">۲</span><b>لینک را بفرست</b><p>لینک گروه را در تلگرام، واتساپ یا ایتا بفرست. هر نفر با شماره خودش وارد می‌شود، ایمیلش را می‌زند و فقط سهم خودش را می‌دهد.</p></li>
            <li><span className="num">۳</span><b>با هم فعال می‌شود</b><p>وقتی همه پرداخت کردند، اشتراک‌ها جداگانه فعال می‌شوند و هر نفر پیامک می‌گیرد. اگر می‌خواهی خودت برای همه حساب کنی، «من حساب می‌کنم» را بزن.</p></li>
          </ol>
          {ex && (
            <div className="grp-ex">
              <span className="mono"><BrandLogo id={ex.id} size={22} /></span>
              <p>مثال: {fa(3)} نفر <span className="en">{ex.name}</span> یک‌ماهه، به‌جای <s className="num">{money(exUnit * 3)}</s> فقط <b className="num">{money(Math.round((exUnit * 3 * (100 - groupOff(ex, 3))) / 100 / 1000) * 1000)}</b> تومان.</p>
            </div>
          )}
        </section>

        <section className="wrap grp-sec">
          <h2>سرویس‌هایی که گروهی می‌شوند</h2>
          <div className="grp-grid">
            {items.map((p) => (
              <Link key={p.id} href={`${productHref(p)}?seats=3&dong=1#buy`} className="grp-card">
                <span className="mono"><BrandLogo id={p.id} size={24} /></span>
                <b className="en">{p.name}</b>
                <small>{p.use}</small>
                <span className="grp-p">نفری از <b className="num">{money(Math.round((minPrice(p) * (100 - groupOff(p, MAX_SEATS))) / 100 / 1000) * 1000)}</b> تومان</span>
                <span className="grp-go">ساختن دنگ <Icon id="arrow" className="arrow" /></span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
