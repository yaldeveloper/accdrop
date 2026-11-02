import type { Metadata } from "next";
import Link from "next/link";
import { RESELLER_TIERS } from "@/lib/account";
import { PRODUCTS } from "@/lib/catalog";
import { fa } from "@/lib/format";
import { BrandLogo, Dots, Icon } from "@/components/brand";
import { ResellerForm } from "@/components/reseller";

export const metadata: Metadata = {
  title: "نمایندگی فروش اکانت هوش مصنوعی | همکاری در فروش",
  description: "نماینده فروش اک‌دراپ شو: اکانت ChatGPT، Claude، Cursor، Canva و ابزارهای حرفه‌ای دیگر را با قیمت همکاری بفروش، تحویل را به ما بسپار و سود ببر.",
  alternates: { canonical: "/reseller" },
};

const STEPS: [string, string][] = [
  ["درخواست بده", "فرم کوتاه پایین صفحه را پر کن. رایگان است."],
  ["تأیید و شروع", "ظرف یک روز کاری بررسی می‌کنیم و پنل نمایندگی‌ات فعال می‌شود."],
  ["بفروش، ما تحویل می‌دهیم", "سفارش را با قیمت همکاری ثبت کن؛ فعال‌سازی و پشتیبانی با ماست."],
];

const BENEFITS: [string, string][] = [
  ["قیمت همکاری", "روی همه ابزارها، زیر قیمت سایت. هرچه بیشتر بفروشی، تخفیفت بیشتر."],
  ["بدون موجودی و ریسک", "لازم نیست اکانتی از قبل بخری. هر وقت سفارش داشتی، ثبتش کن."],
  ["تحویل به نام خودت", "مشتری فقط تو را می‌بیند. اطلاعات تحویل بدون نام اک‌دراپ برایت می‌آید."],
  ["ضمانت ما پشت توست", "اگر اشتراکی قطع شد، ما جایگزین می‌کنیم. اعتبار تو حفظ می‌شود."],
  ["پنل و لینک معرفی", "سفارش‌ها، سود و لینک اختصاصی معرفی را در یک پنل می‌بینی."],
  ["پشتیبانی اختصاصی", "یک کانال مستقیم برای نماینده‌ها، با پاسخ سریع‌تر."],
];

const FAQ: [string, string][] = [
  ["برای نمایندگی باید هزینه‌ای بپردازم؟", "نه. ثبت درخواست و عضویت رایگان است. فقط سفارش‌هایی که ثبت می‌کنی را با قیمت همکاری می‌پردازی."],
  ["حداقل فروش دارد؟", "نه. از اولین فروش در سطح برنزی هستی و با بیشتر شدن فروش ماهانه، سطح و تخفیفت بالا می‌رود."],
  ["مشتری من متوجه اک‌دراپ می‌شود؟", "نه. اطلاعات تحویل بدون نام اک‌دراپ برای تو فرستاده می‌شود تا خودت به مشتری بدهی."],
  ["اگر اشتراک مشتری قطع شد چه؟", "همان ضمانت سایت برای نماینده‌ها هم هست: جایگزین می‌کنیم یا مبلغ روزهای باقی‌مانده برمی‌گردد."],
];

export default function ResellerPage() {
  return (
    <main className="rs">
      <section className="rs-hero">
        <div className="wrap rs-hero-g">
          <div>
            <span className="rs-k"><Dots size={4} />نمایندگی فروش اک‌دراپ</span>
            <h1>ابزارهای حرفه‌ای را بفروش،<br /><b>تحویل با ما.</b></h1>
            <p className="lead">اکانت ChatGPT، Claude، Cursor، Canva و {fa(PRODUCTS.length - 4)} ابزار دیگر را با قیمت همکاری به مشتری‌هایت بفروش. فعال‌سازی، ضمانت و پشتیبانی با ماست؛ سود با تو.</p>
            <div className="rs-cta"><a className="btn btn-paper" href="#apply">درخواست نمایندگی <Icon id="arrow" className="arrow" /></a><span className="muted">رایگان، بدون حداقل فروش</span></div>
          </div>
          <div className="rs-logos" aria-hidden="true">
            {PRODUCTS.map((p) => <span key={p.id}><BrandLogo id={p.id} size={30} /></span>)}
          </div>
        </div>
      </section>

      <div className="light">
        <section className="p2-sec">
          <div className="wrap">
            <div className="p2-h"><h2>چرا نماینده اک‌دراپ؟</h2></div>
            <ul className="rs-ben">{BENEFITS.map(([t, d]) => <li key={t}><Icon id="check" /><div><b>{t}</b><span>{d}</span></div></li>)}</ul>
          </div>
        </section>

        <section className="p2-sec">
          <div className="wrap p2-two">
            <div className="p2-h"><h2>سطح‌های نمایندگی</h2><p>سطحت هر ماه بر اساس فروش همان ماه تعیین می‌شود.</p></div>
            <div className="rs-tiers">
              {RESELLER_TIERS.map((t, i) => (
                <div key={t.key} className={i === 1 ? "mid" : ""}>
                  <small>{t.title}</small>
                  <b className="num">{fa(Math.round(t.rate * 100))}٪</b>
                  <span>زیر قیمت سایت</span>
                  <em>{t.need}</em>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="p2-sec">
          <div className="wrap p2-two">
            <div className="p2-h"><h2>چطور شروع کنم؟</h2></div>
            <ol className="rs-steps">{STEPS.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ol>
          </div>
        </section>
      </div>

      <section className="rs-apply" id="apply">
        <div className="wrap p2-two">
          <div className="p2-h">
            <h2>همین حالا درخواست بده</h2>
            <p className="muted">کمتر از دو دقیقه. بعد از تأیید، پنل نمایندگی در حساب کاربری‌ات فعال می‌شود.</p>
            <div className="faq rs-faq">
              {FAQ.map(([q, a]) => <details key={q}><summary>{q}<span className="pm" /></summary><p>{a}</p></details>)}
            </div>
          </div>
          <ResellerForm />
        </div>
      </section>
      <p className="wrap muted fine" style={{ paddingBottom: 40, textAlign: "right" }}>درصدهای تخفیف نمونه‌اند و پیش از راه‌اندازی نهایی می‌شوند. <Link className="link" href="/guarantee">شرایط ضمانت</Link></p>
    </main>
  );
}
