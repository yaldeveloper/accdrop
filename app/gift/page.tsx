import type { Metadata } from "next";
import { GiftBuilder } from "@/components/gift";

export const metadata: Metadata = {
  title: "کارت هدیه اک‌دراپ | هدیه بده، انتخاب با خودش",
  description: "اعتبار اک‌دراپ هدیه بده: طرح و پیام اختصاصی، ارسال پیامکی همین الان یا در روز و ساعت دلخواه. گیرنده روی هر سرویسی که بخواهد خرجش می‌کند.",
  alternates: { canonical: "/gift" },
};

export default function GiftPage() {
  return <main className="gift-main"><GiftBuilder /></main>;
}
