// Sample catalogue. Prices are placeholders in Toman; replace with data from the admin panel / API.

export type DeliveryType = "own" | "ready";
export type Category = "ai" | "code" | "create" | "work";
export type Months = "1" | "3" | "12";

export type Product = {
  id: string;
  name: string;
  maker: string;
  category: Category;
  monogram: string;
  etaMinutes: number;
  description: string;
  plans: Partial<Record<Months, Partial<Record<DeliveryType, number>>>>;
  includes: string[];
};

export type Drop = {
  number: number;
  productId: string;
  plan: Months;
  type: DeliveryType;
  was: number;
  price: number;
  left: number;
  of: number;
};

export const CATEGORIES: Record<"all" | Category, string> = {
  all: "همه",
  ai: "هوش مصنوعی",
  code: "برنامه‌نویسی",
  create: "طراحی و ویدئو",
  work: "بهره‌وری",
};

export const DELIVERY: Record<DeliveryType, { title: string; detail: string }> = {
  own: { title: "روی ایمیل خودت", detail: "اکانت شخصی؛ تاریخچه حفظ می‌شود" },
  ready: { title: "اکانت آماده", detail: "اکانت اختصاصی تازه با ایمیل و رمز" },
};

export const PRODUCTS: Product[] = [
  { id: "chatgpt", name: "ChatGPT Plus", maker: "OpenAI", category: "ai", monogram: "GPT", etaMinutes: 10,
    description: "دستیار همه‌کاره برای نوشتن، تحلیل و ساخت",
    plans: { "1": { own: 1890000, ready: 1590000 }, "3": { own: 5390000, ready: 4490000 } },
    includes: ["جدیدترین مدل‌های OpenAI", "تولید تصویر، صدا و Deep Research", "سقف پیام بسیار بالاتر"] },
  { id: "claude", name: "Claude Pro", maker: "Anthropic", category: "ai", monogram: "CL", etaMinutes: 20,
    description: "برای نوشتن دقیق، کدنویسی و اسناد طولانی",
    plans: { "1": { own: 2090000 }, "3": { own: 5990000 } },
    includes: ["مدل‌های Claude با سقف استفاده بالاتر", "Projects و Claude Code", "پردازش فایل‌های حجیم"] },
  { id: "gemini", name: "Google AI Pro", maker: "Google", category: "ai", monogram: "GE", etaMinutes: 15,
    description: "Gemini به‌همراه ۲ ترابایت فضای ابری",
    plans: { "1": { own: 1190000 }, "12": { own: 11900000 } },
    includes: ["Gemini Pro و Deep Research", "۲ ترابایت Google One", "Gemini در Gmail و Docs"] },
  { id: "perplexity", name: "Perplexity Pro", maker: "Perplexity", category: "ai", monogram: "PX", etaMinutes: 10,
    description: "جست‌وجوی هوشمند با منبع",
    plans: { "1": { own: 990000 }, "12": { own: 7900000 } },
    includes: ["جست‌وجوی Pro نامحدود", "انتخاب بین مدل‌های برتر", "تحلیل فایل"] },
  { id: "grok", name: "SuperGrok", maker: "xAI", category: "ai", monogram: "GK", etaMinutes: 20,
    description: "مدل‌های پیشرفته Grok",
    plans: { "1": { own: 2190000, ready: 1890000 } },
    includes: ["مدل‌های پیشرفته Grok", "تولید تصویر", "سقف استفاده بالاتر"] },
  { id: "cursor", name: "Cursor Pro", maker: "Anysphere", category: "code", monogram: "CU", etaMinutes: 20,
    description: "ادیتور کد با هوش مصنوعی",
    plans: { "1": { own: 1990000 }, "12": { own: 18900000 } },
    includes: ["تکمیل کد نامحدود", "درخواست‌های سریع ماهانه", "Agent و Background Agents"] },
  { id: "copilot", name: "GitHub Copilot", maker: "GitHub", category: "code", monogram: "CO", etaMinutes: 20,
    description: "دستیار کدنویسی در IDE",
    plans: { "1": { own: 990000 }, "12": { own: 9500000 } },
    includes: ["تکمیل کد در VS Code و JetBrains", "Copilot Chat", "چند مدل"] },
  { id: "adobe", name: "Creative Cloud", maker: "Adobe", category: "create", monogram: "AD", etaMinutes: 30,
    description: "همه اپ‌های Adobe به‌همراه Firefly",
    plans: { "1": { own: 3490000 }, "12": { own: 34900000 } },
    includes: ["Photoshop، Illustrator، Premiere و بیشتر", "اعتبار Firefly", "۱۰۰ گیگ فضای ابری"] },
  { id: "canva", name: "Canva Pro", maker: "Canva", category: "create", monogram: "CA", etaMinutes: 5,
    description: "طراحی سریع با قالب‌های حرفه‌ای",
    plans: { "1": { own: 390000 }, "12": { own: 2900000 } },
    includes: ["همه قالب‌ها و المان‌های Pro", "Magic Studio", "Brand Kit"] },
  { id: "capcut", name: "CapCut Pro", maker: "ByteDance", category: "create", monogram: "CC", etaMinutes: 10,
    description: "تدوین ویدئو برای تولیدکننده محتوا",
    plans: { "1": { own: 690000, ready: 490000 }, "12": { own: 5900000 } },
    includes: ["افکت‌ها و فیلترهای Pro", "خروجی بدون واترمارک", "ابزارهای هوش مصنوعی"] },
  { id: "kling", name: "Kling AI", maker: "Kuaishou", category: "create", monogram: "KL", etaMinutes: 20,
    description: "ساخت ویدئو با هوش مصنوعی",
    plans: { "1": { own: 1490000 } },
    includes: ["اعتبار ماهانه ساخت ویدئو", "کیفیت حرفه‌ای", "بدون واترمارک"] },
  { id: "notion", name: "Notion Plus", maker: "Notion", category: "work", monogram: "NO", etaMinutes: 15,
    description: "فضای کار و دانش، همراه Notion AI",
    plans: { "1": { own: 890000 }, "12": { own: 8500000 } },
    includes: ["Notion AI", "فضای کاری تیمی", "تاریخچه نسخه‌ها"] },
];

export const CURRENT_DROP: Drop = {
  number: 7, productId: "chatgpt", plan: "1", type: "own", was: 1890000, price: 1490000, left: 7, of: 40,
};

export const VOICES: [string, string][] = [
  ["هفت دقیقه بعد از پرداخت، Plus روی اکانت خودم فعال شد. بی‌دردسرترین خریدی که این مدت داشتم.", "سارا م. · طراح محصول"],
  ["وسط ماه Cursor مشکل پیدا کرد. بدون سؤال و جواب، یک ساعته جایگزین شد. برای همین تمدیدم را هم از همین‌جا کردم.", "علی ر. · توسعه‌دهنده"],
  ["قیمت از اول تا آخر همانی بود که روی سایت دیدم. حس خرید از یک برند واقعی را دارد، نه یک پیج.", "نگار ک. · تولیدکننده محتوا"],
];

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id)!;
export const planKeys = (p: Product) => Object.keys(p.plans) as Months[];
export const minPrice = (p: Product) =>
  Math.min(...Object.values(p.plans).flatMap((o) => Object.values(o ?? {}) as number[]));
export const deliveryTypes = (p: Product) =>
  [...new Set(planKeys(p).flatMap((m) => Object.keys(p.plans[m] ?? {})))] as DeliveryType[];

export type Selection = { id: string; plan: Months; type: DeliveryType };

export function priceOf(sel: Selection): { price: number; was?: number } {
  const base = productById(sel.id).plans[sel.plan]?.[sel.type] ?? 0;
  const d = CURRENT_DROP;
  if (d.productId === sel.id && d.plan === sel.plan && d.type === sel.type) return { price: d.price, was: base };
  return { price: base };
}
