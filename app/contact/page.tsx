import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { Icon } from "@/components/brand";

export const metadata: Metadata = { title: "تماس و پشتیبانی", description: "پشتیبانی فارسی اک‌دراپ، هر روز ۹ صبح تا ۱۲ شب در تلگرام و ایمیل.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <DocPage title="تماس و پشتیبانی" lead="یک آدم واقعی جواب می‌دهد؛ هر روز، حتی جمعه‌ها، از ۹ صبح تا ۱۲ شب.">
      <section className="doc-cards">
        <a href="#"><Icon id="chat" /><b>تلگرام</b><span>سریع‌ترین راه؛ معمولاً زیر ۱۰ دقیقه.</span></a>
        <a href="mailto:hello@accdrop.ir"><Icon id="box" /><b className="en">hello@accdrop.ir</b><span>برای کارهای اداری و همکاری.</span></a>
        <div><Icon id="clock" /><b>ساعت پاسخگویی</b><span>هر روز ۹ تا ۲۴</span></div>
      </section>
      <h2>قبل از پیام دادن</h2>
      <p>اگر درباره یک سفارش سؤال داری، کد سفارش (مثل AD-48213) را همراه پیامت بفرست تا سریع‌تر پیگیری کنیم. وضعیت همه سفارش‌ها در حساب کاربری‌ات هم دیده می‌شود.</p>
      <p className="doc-note">شماره تلفن، نشانی و نماد اعتماد الکترونیکی بعد از ثبت رسمی اینجا اضافه می‌شوند.</p>
    </DocPage>
  );
}
