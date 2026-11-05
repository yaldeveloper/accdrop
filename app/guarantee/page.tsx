import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/doc-page";
import { BrandLogo } from "@/components/brand";
import { CATEGORIES, deliveryTypes, listed, variantsOf, type Category } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { loadCatalog } from "@/lib/server/catalog";
import { receiveOf, warrantyOf } from "@/lib/facts";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "گارانتی و بازگشت وجه",
  description: "گارانتی اک‌دراپ: اگر چیزی که تحویل گرفتی کار نکرد، جایگزین یا بازگشت کامل وجه. مدت گارانتی هر محصول در یک جدول.",
  alternates: { canonical: "/guarantee" },
};

export default async function GuaranteePage() {
  await loadCatalog();
  const cats = (Object.keys(CATEGORIES) as ("all" | Category)[]).filter((c): c is Category => c !== "all" && listed().some((p) => p.category === c));
  return (
    <DocPage title="گارانتی و بازگشت وجه" lead="هر محصول گارانتی مشخص خودش را دارد و قبل از پرداخت، کنار دکمه خرید نوشته شده. این صفحه می‌گوید هر کدام یعنی چه، و گارانتی همه محصولات را یک‌جا نشان می‌دهد." updated="آبان ۱۴۰۵">
      <section className="doc-cards">
        <div><b>تحویلی کار نکرد؟</b><span>جایگزین می‌کنیم یا کل مبلغ برمی‌گردد. برای همه محصولات.</span></div>
        <div><b>بعد از تحویل قطع شد؟</b><span>در مدت گارانتی همان محصول، جایگزین یا بازگشت مبلغ روزهای باقی‌مانده.</span></div>
        <div><b>هنوز تحویل نشده؟</b><span>تا قبل از تحویل، انصراف بده و کل مبلغ برمی‌گردد.</span></div>
      </section>

      <h2>۱. چهار نوع گارانتی</h2>
      <ul>
        <li><b>گارانتی با مدت</b> (مثلاً ۲۵ روز، یک ماه، یک سال، تا پایان اشتراک): اگر در این مدت از کار افتاد، ظرف ۲۴ ساعت از گزارش تو جایگزین می‌کنیم؛ اگر نشد، مبلغ روزهای باقی‌مانده را برمی‌گردانیم.</li>
        <li><b>تحویل سالم تضمینی</b> (کدها، گیفت‌کارت‌ها و اعتبارها): کد یا اکانت لحظه تحویل باید سالم باشد؛ اگر نبود، جایگزین یا بازگشت کامل وجه. بعد از وارد کردن کد روی اکانت، کار تمام است.</li>
        <li><b>گارانتی کوتاه</b> (۲۴ یا ۴۸ ساعت): فقط همین مدت پوشش دارد. همان روز اول امتحانش کن.</li>
        <li><b>بدون گارانتی</b>: فقط سالم بودن در لحظه تحویل تضمین می‌شود. این محصولات ارزان‌ترند و قبل از خرید با رنگ زرد مشخص شده‌اند.</li>
      </ul>

      <h2>۲. گارانتی همه محصولات</h2>
      <div className="gw">
        {cats.map((c) => (
          <section key={c}>
            <h3>{CATEGORIES[c]}</h3>
            <ul>
              {listed().filter((p) => p.category === c).flatMap(variantsOf).map((p) => {
                const w = warrantyOf(p);
                return (
                  <li key={p.id}>
                    <Link href={productHref(p)}><span className="mono"><BrandLogo id={p.id} size={18} /></span><b className="en">{p.name}</b></Link>
                    <small>{receiveOf(p, deliveryTypes(p)[0]).title}</small>
                    <span className={`gw-w w-${w.level}`}>{w.label}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <h2>۳. انصراف از خرید</h2>
      <p>تا وقتی سفارش تحویل نشده، می‌توانی انصراف بدهی و کل مبلغ به همان کارت برمی‌گردد (حداکثر ۷۲ ساعت کاری). بیشتر محصولات خودکار و همان لحظه تحویل می‌شوند؛ بعد از تحویل کد یا اکانت، انصراف ممکن نیست چون قابل برگشت نیست.</p>

      <h2>۴. مواردی که گارانتی شامل نمی‌شود</h2>
      <ul>
        <li>تغییر کلید 2FA، ایمیل یا رمزی که در راهنمای همان محصول گفته‌ایم دست نزن، یا ورود روی دستگاه‌های بیشتر از حد مجاز.</li>
        <li>اشتراک‌گذاری اکانت آماده با دیگران یا فروش دوباره آن بدون نمایندگی رسمی.</li>
        <li>نقض قوانین سرویس‌دهنده (مثل OpenAI یا Apple) توسط کاربر که به مسدود شدن اکانت منجر شود.</li>
        <li>وارد کردن ایمیل یا یوزرنیم اشتباه هنگام خرید؛ تا قبل از تحویل، اصلاحش می‌کنیم.</li>
      </ul>

      <h2>۵. چطور درخواست بدهم؟</h2>
      <p>از <Link className="link" href="/account/orders">حساب کاربری، بخش سفارش‌ها</Link> سفارش را باز کن و «تیکت برای این سفارش» را بزن. تاریخ پایان گارانتی هر مورد همان‌جا نوشته شده. هر روز از ۹ صبح تا ۱۲ شب پاسخ می‌دهیم.</p>
    </DocPage>
  );
}
