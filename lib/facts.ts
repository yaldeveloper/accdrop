// The three facts a buyer needs before paying, worded the same everywhere (cards, product page, buy box, checkout,
// order page, guarantee page): what they receive, when, and exactly how long the warranty covers it.
import { CATEGORIES, guaranteeOf, isSub, kindOf, listed, variantsOf, type Category, type DeliveryType, type Product } from "./catalog";
import { fa } from "./format";

export type Receive = { title: string; detail: string };

const has = (s: string | undefined, ...w: string[]) => !!s && w.some((x) => s.includes(x));

/** What the customer actually gets for one delivery method: «اکانت آماده», «کد فعال‌سازی», «کلید API»… */
export function receiveOf(p: Product, t: DeliveryType): Receive {
  const d = p.deliver;
  switch (t) {
    case "own": return { title: "فعال‌سازی روی اکانت خودت", detail: `${p.ask?.short ?? "ایمیل"} اکانت ${p.maker} را می‌دهی؛ رمز لازم نیست` };
    case "shared": return { title: "اکانت آماده اشتراکی", detail: "ایمیل و رمز یک اکانت مشترک با چند نفر؛ ارزان‌تر" };
    case "ready": return kindOf(p) === "account" && p.types?.ready
      ? { title: p.types.ready.title, detail: p.types.ready.detail }
      : { title: "اکانت آماده اختصاصی", detail: "ایمیل و رمز یک اکانت تازه که فقط مال توست" };
    case "username": return { title: "فعال‌سازی روی آیدی تلگرام", detail: "فقط یوزرنیم؛ کد ورود و رمز نمی‌خواهیم" };
    case "number": return { title: "شماره مجازی و کد تأیید", detail: "شماره و پیامک تأیید، همین‌جا در صفحه سفارش" };
    case "code": {
      if (kindOf(p) === "gift") return { title: "کد گیفت‌کارت", detail: "کد رسمی که روی اکانت خودت وارد می‌کنی" };
      if (p.id === "appleid") return { title: "اپل آیدی آماده", detail: "ایمیل، رمزها، سؤال‌های امنیتی و تاریخ تولد" };
      if (/-api$/.test(p.id) || p.family === "claude-api") return { title: has(d, "کلید") ? "کلید API" : "کد اعتبار API", detail: "برای استفاده در کد یا ابزارهای برنامه‌نویسی" };
      if (has(d, "لینک فعال‌سازی")) return { title: "لینک فعال‌سازی", detail: "با یک کلیک روی اکانت خودت فعال می‌شود" };
      if (has(d, "کد بازخرید", "کد اعتبار", "کد فعال‌سازی")) return { title: "کد فعال‌سازی", detail: `روی اکانت ${p.maker} خودت وارد می‌کنی` };
      if (has(d, "رمز", "اطلاعات ورود", "اطلاعات اکانت", "Gmail")) return { title: "اکانت آماده", detail: "ایمیل و رمز ورود، فقط برای تو" };
      return { title: "کد رسمی", detail: `روی اکانت ${p.maker} خودت فعال می‌کنی` };
    }
  }
}

/** When it arrives, in words: «فوری»، «حدود ۵ دقیقه»… */
export function whenOf(p: Product, t?: DeliveryType): string {
  if (p.id === "appleid" && t === "ready") return "معمولاً تا چند ساعت";
  if (p.etaMinutes === 0) return "فوری، همان لحظه";
  if (p.etaMinutes <= 15) return `خودکار، حدود ${fa(p.etaMinutes)} دقیقه`;
  if (p.etaMinutes < 60) return `حدود ${fa(p.etaMinutes)} دقیقه`;
  return `حدود ${fa(Math.round(p.etaMinutes / 60))} ساعت، در ساعت کاری`;
}
/** Two-word version for cards. */
export const whenShort = (p: Product) => (p.etaMinutes === 0 ? "تحویل فوری" : p.etaMinutes <= 15 ? "تحویل خودکار" : "تحویل دستی");

/**
 * - `period`: covered for a stated time (replacement, or a refund for the days left).
 * - `delivery`: covered at delivery only (works when delivered, or replacement / full refund). Normal for codes.
 * - `short`: covered for a day or two only.
 * - `none`: no warranty after delivery.
 */
export type WarrantyLevel = "period" | "delivery" | "short" | "none";
export type Warranty = { label: string; level: WarrantyLevel; note: string; days?: number };

const FA2EN = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

/** Days of cover in a warranty line, or undefined when it is not a fixed period. */
function daysIn(s: string): number | undefined {
  const t = FA2EN(s).replace("یک", "1");
  if (/مادام/.test(t)) return undefined;
  const m = t.match(/(\d+)\s*(روز|ساعت|ماه|سال)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2] === "روز" ? n : m[2] === "ساعت" ? Math.max(1, Math.round(n / 24)) : m[2] === "ماه" ? n * 30 : n * 365;
}

/** The warranty of a product (or of one option of it, e.g. Apple ID «iCloud مادام‌العمر»), in plain words. */
export function warrantyOf(p: Product, plan?: string): Warranty {
  let label = guaranteeOf(p);
  // Apple ID names the warranty in the option itself.
  const opt = plan ? p.labels?.[plan] : undefined;
  if (opt && /مادام/.test(opt)) label = "گارانتی مادام‌العمر";
  else if (opt && /(\d|[۰-۹])+\s*روزه/.test(opt)) label = `${opt.match(/[۰-۹\d]+/)![0]} روز گارانتی`;

  if (/^بدون گارانتی/.test(label)) return { label: "بدون گارانتی", level: "none", note: "فقط سالم بودن در لحظه تحویل تضمین می‌شود؛ بعد از آن گارانتی ندارد." };
  if (/مادام/.test(label)) return { label, level: "period", note: "تا وقتی اکانت مال توست؛ اگر بسته شد، جایگزین می‌کنیم." };
  if (/تا پایان (اشتراک|اعتبار)|تا روز آخر/.test(label)) {
    const days = isSub(p) && plan && Number(plan) ? Number(plan) * 30 : undefined;
    return { label, level: "period", days, note: "اگر در این مدت قطع شد، جایگزین می‌کنیم؛ اگر نشد، مبلغ روزهای باقی‌مانده برمی‌گردد." };
  }
  const days = daysIn(label);
  if (days !== undefined && days <= 2) return { label, level: "short", days, note: `فقط ${days === 1 ? "۲۴ ساعت" : "۴۸ ساعت"} اول پوشش دارد؛ همان روز اول امتحانش کن.` };
  if (days !== undefined) return { label, level: "period", days, note: "اگر در این مدت قطع شد، جایگزین می‌کنیم؛ اگر نشد، مبلغ روزهای باقی‌مانده برمی‌گردد." };
  return { label, level: "delivery", note: "اگر کد یا اکانت تحویلی کار نکرد، جایگزین می‌کنیم یا کل مبلغ برمی‌گردد." };
}

/** Short warranty text for cards: «۲۵ روز گارانتی», «بدون گارانتی»… */
export const warrantyShort = (p: Product) => {
  const w = warrantyOf(p);
  if (w.level === "delivery") return "تحویل سالم تضمینی";
  return w.label.replace("گارانتی کامل", "گارانتی").replace(" کامل", "");
};

/** Card version for a whole family: one line when every version shares it, otherwise «گارانتی بسته به نسخه». */
export function cardWarranty(p: Product): { text: string; level: WarrantyLevel } {
  const v = variantsOf(p);
  const all = new Set(v.map(warrantyShort));
  if (all.size > 1) return { text: "گارانتی بسته به نسخه", level: v.some((x) => warrantyOf(x).level === "none") ? "short" : "period" };
  return { text: warrantyShort(p), level: warrantyOf(p).level };
}

/** «ChatGPT، Gemini، Kling»: the first three brands of a category, so the menu never lags the catalog. */
export function catLine(c: Category) {
  const names = [...new Set(listed().filter((p) => p.category === c).map((p) => p.name.split(" ")[0]))];
  return names.slice(0, 3).join("، ") || CATEGORIES[c];
}
