// Sample catalogue. Prices are placeholders in Toman; replace with data from the admin panel / API.
import { duration, fa } from "./format";

/** How a purchase reaches the customer. */
export type DeliveryType = "own" | "ready" | "username" | "code" | "number";
export type Category = "ai" | "code" | "create" | "work" | "apple" | "telegram" | "number";
/** What the customer picks: a subscription length, a gift-card amount, a region, a quantity or a country. */
export type ProductKind = "sub" | "gift" | "account" | "qty" | "number";
/** Key of one purchasable option: months ("1", "12"), dollars ("10"), a region ("us"), a quantity ("500"). */
export type Months = string;

export type Product = {
  id: string;
  name: string;
  maker: string;
  category: Category;
  /** Defaults to "sub" (a subscription with a duration). */
  kind?: ProductKind;
  /** Label of the option picker, e.g. «مبلغ کارت». Defaults to «مدت اشتراک». */
  axis?: string;
  /** Display names of option keys that are not month counts. */
  labels?: Record<string, string>;
  monogram: string;
  /** 0 = delivered instantly and automatically. */
  etaMinutes: number;
  description: string;
  /** Short, plain-language promise shown on the pass, e.g. «برای نوشتن و فکر کردن». */
  use: string;
  plans: Record<string, Partial<Record<DeliveryType, number>>>;
  includes: string[];
  /** Hidden from the store (set from the admin panel). */
  hidden?: boolean;
  /** Small label on cards, e.g. «پرفروش». */
  badge?: string;
  /** Group buy: [seats, percent off per seat], ascending. */
  group?: [number, number][];
  /** Offers the dedicated foreign static IP add-on. */
  ip?: boolean;
  /** Brand colour for the product page (overrides the built-in theme). */
  color?: string;
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
  code: "کدنویسی",
  create: "طراحی و ویدئو",
  work: "کار و آموزش",
  apple: "اپل و گیفت‌کارت",
  telegram: "تلگرام",
  number: "شماره مجازی",
};

/** `input` = what we ask the customer for at checkout. */
export const DELIVERY: Record<DeliveryType, { title: string; detail: string; input: "email" | "username" | null }> = {
  own: { title: "روی ایمیل خودم", detail: "روی اکانت شخصی خودت فعال می‌شود", input: "email" },
  ready: { title: "اکانت آماده", detail: "یک اکانت تازه، فقط برای تو", input: null },
  username: { title: "روی آیدی تلگرام", detail: "فقط یوزرنیم لازم است؛ ورود و رمز نمی‌خواهیم", input: "username" },
  code: { title: "کد گیفت‌کارت", detail: "کد فوراً در حساب کاربری و پیامک", input: null },
  number: { title: "شماره آماده", detail: "شماره و کد تأیید در حساب کاربری", input: null },
};

export const PRODUCTS: Product[] = [
  { id: "chatgpt", name: "ChatGPT Plus", maker: "OpenAI", category: "ai", monogram: "GPT", group: [[2, 5], [3, 8], [5, 12]], ip: true, badge: "پرفروش", etaMinutes: 10,
    description: "دستیار همه‌کاره برای نوشتن، تحلیل و ساخت", use: "برای نوشتن، فکر کردن و ساختن",
    plans: { "1": { own: 1890000, ready: 1590000 }, "3": { own: 5390000, ready: 4490000 } },
    includes: ["جدیدترین مدل‌های OpenAI", "تولید تصویر، صدا و Deep Research", "سقف پیام بسیار بالاتر"] },
  { id: "claude", name: "Claude Pro", maker: "Anthropic", category: "ai", monogram: "CL", group: [[2, 5], [3, 8], [5, 12]], ip: true, etaMinutes: 20,
    description: "برای نوشتن دقیق، کدنویسی و اسناد طولانی", use: "برای متن دقیق و کد تمیز",
    plans: { "1": { own: 2090000 }, "3": { own: 5990000 } },
    includes: ["مدل‌های Claude با سقف استفاده بالاتر", "Projects و Claude Code", "پردازش فایل‌های حجیم"] },
  { id: "gemini", name: "Google AI Pro", maker: "Google", category: "ai", monogram: "GE", group: [[2, 5], [3, 8], [5, 12]], ip: true, etaMinutes: 15,
    description: "Gemini به‌همراه ۲ ترابایت فضای ابری", use: "هوش گوگل، کنار Gmail و Docs",
    plans: { "1": { own: 1190000 }, "12": { own: 11900000 } },
    includes: ["Gemini Pro و Deep Research", "۲ ترابایت Google One", "Gemini در Gmail و Docs"] },
  { id: "perplexity", name: "Perplexity Pro", maker: "Perplexity", category: "ai", monogram: "PX", ip: true, etaMinutes: 10,
    description: "جست‌وجوی هوشمند با منبع", use: "جواب دقیق، با منبع",
    plans: { "1": { own: 990000 }, "12": { own: 7900000 } },
    includes: ["جست‌وجوی Pro نامحدود", "انتخاب بین مدل‌های برتر", "تحلیل فایل"] },
  { id: "grok", name: "SuperGrok", maker: "xAI", category: "ai", monogram: "GK", ip: true, etaMinutes: 20,
    description: "مدل‌های پیشرفته Grok", use: "سریع و بی‌پرده",
    plans: { "1": { own: 2190000, ready: 1890000 } },
    includes: ["مدل‌های پیشرفته Grok", "تولید تصویر", "سقف استفاده بالاتر"] },
  { id: "cursor", name: "Cursor Pro", maker: "Anysphere", category: "code", monogram: "CU", group: [[2, 5], [3, 8], [5, 12]], ip: true, etaMinutes: 20,
    description: "ادیتور کد با هوش مصنوعی", use: "کدنویسی با هوش مصنوعی",
    plans: { "1": { own: 1990000 }, "12": { own: 18900000 } },
    includes: ["تکمیل کد نامحدود", "درخواست‌های سریع ماهانه", "Agent و Background Agents"] },
  { id: "copilot", name: "GitHub Copilot", maker: "GitHub", category: "code", monogram: "CO", ip: true, etaMinutes: 20,
    description: "دستیار کدنویسی در IDE", use: "دستیار کد در ادیتور تو",
    plans: { "1": { own: 990000 }, "12": { own: 9500000 } },
    includes: ["تکمیل کد در VS Code و JetBrains", "Copilot Chat", "چند مدل"] },
  { id: "adobe", name: "Creative Cloud", maker: "Adobe", category: "create", monogram: "AD", etaMinutes: 30,
    description: "همه اپ‌های Adobe به‌همراه Firefly", use: "همه ابزارهای خلق Adobe",
    plans: { "1": { own: 3490000 }, "12": { own: 34900000 } },
    includes: ["Photoshop، Illustrator، Premiere و بیشتر", "اعتبار Firefly", "۱۰۰ گیگ فضای ابری"] },
  { id: "canva", name: "Canva Pro", maker: "Canva", category: "create", monogram: "CA", group: [[2, 5], [3, 8], [5, 12]], etaMinutes: 5,
    description: "طراحی سریع با قالب‌های حرفه‌ای", use: "طراحی در چند دقیقه",
    plans: { "1": { own: 390000 }, "12": { own: 2900000 } },
    includes: ["همه قالب‌ها و المان‌های Pro", "Magic Studio", "Brand Kit"] },
  { id: "capcut", name: "CapCut Pro", maker: "ByteDance", category: "create", monogram: "CC", etaMinutes: 10,
    description: "تدوین ویدئو برای تولیدکننده محتوا", use: "تدوین ویدئو، حرفه‌ای",
    plans: { "1": { own: 690000, ready: 490000 }, "12": { own: 5900000 } },
    includes: ["افکت‌ها و فیلترهای Pro", "خروجی بدون واترمارک", "ابزارهای هوش مصنوعی"] },
  { id: "kling", name: "Kling AI", maker: "Kuaishou", category: "create", monogram: "KL", etaMinutes: 20,
    description: "ساخت ویدئو با هوش مصنوعی", use: "از متن به ویدئو",
    plans: { "1": { own: 1490000 } },
    includes: ["اعتبار ماهانه ساخت ویدئو", "کیفیت حرفه‌ای", "بدون واترمارک"] },
  { id: "notion", name: "Notion Plus", maker: "Notion", category: "work", monogram: "NO", group: [[2, 5], [3, 8], [5, 12]], etaMinutes: 15,
    description: "فضای کار و دانش، همراه Notion AI", use: "نوشتن، برنامه‌ریزی، یادداشت",
    plans: { "1": { own: 890000 }, "12": { own: 8500000 } },
    includes: ["Notion AI", "فضای کاری تیمی", "تاریخچه نسخه‌ها"] },
  { id: "tgpremium", name: "Telegram Premium", maker: "Telegram", category: "telegram", monogram: "TG", etaMinutes: 10,
    description: "امکانات ویژه تلگرام، روی آیدی خودت", use: "تلگرام بدون محدودیت",
    plans: { "3": { username: 1190000 }, "6": { username: 1590000 }, "12": { username: 2790000 } },
    includes: ["آپلود فایل تا ۴ گیگابایت و دانلود سریع‌تر", "تبدیل ویس به متن و بدون تبلیغ", "استیکر، ری‌اکشن و نشان ویژه"] },
  { id: "tgstars", name: "Telegram Stars", maker: "Telegram", category: "telegram", kind: "qty", monogram: "ST", etaMinutes: 10,
    axis: "تعداد استارز", labels: { "100": "۱۰۰ استارز", "250": "۲۵۰ استارز", "500": "۵۰۰ استارز", "1000": "۱۰۰۰ استارز" },
    description: "استارز برای ربات‌ها، کانال‌ها و هدیه", use: "پرداخت داخل تلگرام",
    plans: { "100": { username: 190000 }, "250": { username: 450000 }, "500": { username: 890000 }, "1000": { username: 1750000 } },
    includes: ["خرید در ربات‌ها و مینی‌اپ‌ها", "حمایت از کانال‌ها و پست‌های پولی", "هدیه دادن به دوستان"] },
  { id: "appleid", name: "Apple ID", maker: "Apple", category: "apple", kind: "account", monogram: "AP", etaMinutes: 30,
    axis: "کشور اکانت", labels: { us: "آمریکا", tr: "ترکیه", uk: "انگلیس" },
    description: "اپل آیدی آماده و اختصاصی", use: "ورود به App Store",
    plans: { us: { ready: 390000 }, tr: { ready: 390000 }, uk: { ready: 450000 } },
    includes: ["اکانت تازه با ایمیل جدید، فقط برای تو", "سؤال‌های امنیتی و تاریخ تولد", "مناسب App Store و iCloud همان کشور"] },
  { id: "applegift", name: "Apple Gift Card", maker: "Apple", category: "apple", kind: "gift", monogram: "GC", etaMinutes: 0,
    axis: "مبلغ کارت (آمریکا)", labels: { "5": "۵ دلار", "10": "۱۰ دلار", "25": "۲۵ دلار", "50": "۵۰ دلار" },
    description: "گیفت‌کارت اپل آمریکا از منبع رسمی", use: "شارژ اپل آیدی",
    plans: { "5": { code: 520000 }, "10": { code: 1020000 }, "25": { code: 2520000 }, "50": { code: 4990000 } },
    includes: ["کد قانونی از منبع رسمی", "تحویل خودکار در حساب کاربری", "برای اپ، بازی، iCloud و اشتراک‌ها"] },
  { id: "linkedin", name: "LinkedIn Premium", maker: "LinkedIn", category: "work", monogram: "IN", etaMinutes: 30,
    description: "دیده‌شدن بیشتر و پیام به استخدام‌کننده‌ها", use: "برای پیدا کردن کار بهتر",
    plans: { "1": { own: 3290000 }, "3": { own: 9490000 } },
    includes: ["InMail به استخدام‌کننده‌ها", "دیدن بازدیدکننده‌های پروفایل", "دوره‌های LinkedIn Learning"] },
  { id: "duolingo", name: "Super Duolingo", maker: "Duolingo", category: "work", monogram: "DU", etaMinutes: 20,
    description: "یادگیری زبان بدون تبلیغ و محدودیت", use: "زبان یاد بگیر، بی‌وقفه",
    plans: { "1": { own: 690000 }, "12": { own: 4900000 } },
    includes: ["بدون تبلیغ", "قلب نامحدود", "تمرین شخصی‌سازی‌شده"] },
  { id: "vnumber", name: "Virtual Number", maker: "AccDrop", category: "number", kind: "number", monogram: "VN", etaMinutes: 0,
    axis: "کشور شماره", labels: { us: "آمریکا", uk: "انگلیس", ca: "کانادا", nl: "هلند" },
    description: "شماره مجازی برای تلگرام و واتس‌اپ", use: "ثبت‌نام بدون سیم‌کارت",
    plans: { ca: { number: 250000 }, us: { number: 290000 }, uk: { number: 390000 }, nl: { number: 450000 } },
    includes: ["شماره اختصاصی برای ثبت‌نام", "کد تأیید در حساب کاربری", "اگر کد نیامد، کل مبلغ برمی‌گردد"] },
];

export const CURRENT_DROP: Drop = {
  number: 7, productId: "chatgpt", plan: "1", type: "own", was: 1890000, price: 1490000, left: 7, of: 40,
};

export const kindOf = (p: Product): ProductKind => p.kind ?? "sub";
export const isSub = (p: Product) => kindOf(p) === "sub";
/** Display name of an option key: «یک ماهه», «۱۰ دلار», «آمریکا». */
export const optionLabel = (p: Product, key: string) => p.labels?.[key] ?? duration(key);
export const axisOf = (p: Product) => p.axis ?? "مدت اشتراک";
/** «فوری» or «حدود ۱۰ دقیقه». */
export const etaText = (p: Product) => (p.etaMinutes === 0 ? "خودکار" : `حدود ${fa(p.etaMinutes)} دقیقه`);
/** Short noun for what is bought: «اشتراک», «گیفت‌کارت»… */
export const nounOf = (p: Product) => ({ sub: "اشتراک", gift: "گیفت‌کارت", account: "اکانت", qty: "استارز", number: "شماره" })[kindOf(p)];

/** Every product including hidden ones (old orders still need to show them). PRODUCTS holds only the visible ones. */
export const ALL_PRODUCTS: Product[] = [...PRODUCTS];
export const productById = (id: string) => ALL_PRODUCTS.find((p) => p.id === id) ?? PRODUCTS.find((p) => p.id === id)!;
export const planKeys = (p: Product) => Object.keys(p.plans) as Months[];
export const minPrice = (p: Product) =>
  Math.min(...Object.values(p.plans).flatMap((o) => Object.values(o ?? {}) as number[]));
export const deliveryTypes = (p: Product) =>
  [...new Set(planKeys(p).flatMap((m) => Object.keys(p.plans[m] ?? {})))] as DeliveryType[];

/** seats: group buy size (1 = just me). ip: country of the static IP add-on. */
export type Selection = { id: string; plan: Months; type: DeliveryType; seats?: number; ip?: string };

/** Dedicated foreign static IP, sold as an add-on to some subscriptions. Price per month of the plan. */
export const STATIC_IP = {
  title: "آی‌پی ثابت اختصاصی",
  perMonth: 390000,
  countries: { de: "آلمان", nl: "هلند", uk: "انگلیس", us: "آمریکا", fr: "فرانسه" } as Record<string, string>,
};
export const MAX_SEATS = 6;

/** Percent off per seat for a group of `seats`. */
export function groupOff(p: Product, seats: number) {
  let off = 0;
  for (const [n, pct] of p.group ?? []) if (seats >= n) off = pct;
  return off;
}
export const ipPrice = (p: Product, plan: Months) => (p.ip && isSub(p) ? STATIC_IP.perMonth * Math.max(1, Number(plan) || 1) : 0);

/** Full price of one cart line: seats with group discount, plus add-ons. */
export function linePrice(sel: Selection) {
  const p = productById(sel.id);
  const seats = p.group?.length ? Math.min(MAX_SEATS, Math.max(1, sel.seats ?? 1)) : 1;
  const unit = priceOf(sel).price;
  const group = Math.round((unit * seats * (100 - groupOff(p, seats))) / 100 / 1000) * 1000;
  const ip = sel.ip && STATIC_IP.countries[sel.ip] ? ipPrice(p, sel.plan) : 0;
  return group + ip;
}

/** «۳ نفر • آی‌پی ثابت آلمان», or "" for a plain line. */
export function extrasLabel(sel: Selection) {
  const out: string[] = [];
  if ((sel.seats ?? 1) > 1) out.push(`خرید گروهی ${fa(sel.seats!)} نفره`);
  if (sel.ip && STATIC_IP.countries[sel.ip]) out.push(`${STATIC_IP.title} ${STATIC_IP.countries[sel.ip]}`);
  return out.join(" • ");
}

export function priceOf(sel: Selection): { price: number; was?: number } {
  const base = productById(sel.id).plans[sel.plan]?.[sel.type] ?? 0;
  const d = CURRENT_DROP;
  if (d.productId === sel.id && d.plan === sel.plan && d.type === sel.type) return { price: d.price, was: base };
  return { price: base };
}

/** What each delivery method means, in plain words, for this product. */
export function deliveryExplain(p: Product, t: DeliveryType) {
  switch (t) {
    case "own": return `ایمیل اکانت ${p.maker} خودت را می‌دهی و اشتراک روی همان فعال می‌شود. رمز نمی‌خواهیم و تاریخچه‌ات می‌ماند.`;
    case "ready": return isSub(p) ? "یک اکانت تازه با ایمیل و رمز تحویل می‌گیری که فقط مال توست. ارزان‌تر و سریع‌تر است." : "یک اکانت تازه با ایمیل، رمز و اطلاعات امنیتی تحویل می‌گیری که فقط مال توست و می‌توانی رمزش را عوض کنی.";
    case "username": return "فقط یوزرنیم تلگرامت را وارد می‌کنی و به‌صورت هدیه روی همان آیدی فعال می‌شود. نه کد ورود می‌خواهیم، نه رمز.";
    case "code": return "بلافاصله بعد از پرداخت، کد گیفت‌کارت در حساب کاربری‌ات نمایش داده و پیامک می‌شود. کد را در App Store وارد می‌کنی و تمام.";
    case "number": return "بعد از پرداخت، شماره در حساب کاربری‌ات نمایش داده می‌شود. در تلگرام یا واتس‌اپ واردش می‌کنی و کد تأیید همان‌جا می‌آید.";
  }
}

/** One-line promise used on product pages. */
export const guaranteeOf = (p: Product) =>
  ({ sub: "تا روز آخر اشتراک", gift: "کد سالم یا بازگشت وجه", account: "تحویل سالم یا جایگزینی", qty: "دریافت کامل یا بازگشت وجه", number: "کد نیامد؟ بازگشت وجه" })[kindOf(p)];


/** When the sample prices were last reviewed (shown on product pages). */
export const PRICES_UPDATED = { fa: "آبان ۱۴۰۵", iso: "2026-11-01" };
