// Product catalogue (prices in Toman). Admin edits are layered on top by lib/catalog-sync.ts.
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
  /** Variant of another product (its id), e.g. ChatGPT Go and Pro are variants of "chatgpt". Listings show the family once. */
  family?: string;
  /** Short variant name shown in the tier switcher: «Go», «Plus», «Pro», «Max». */
  tier?: string;
  /** Supplier (Insight Store) product id per option; paid code lines are bought and delivered automatically. */
  ix?: Record<string, number>;
  /** What the customer receives, replacing the generic text of the delivery method. */
  deliver?: string;
  /** The last step after delivery: how to redeem or use what was delivered. */
  howTo?: string;
  /** Short warranty line when it differs from the default promise, e.g. «۲۵ روز گارانتی». */
  warranty?: string;
  /** Selling price in USDT per code option. When set, the Toman price follows the live Tether rate. */
  usdt?: Record<string, number>;
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
  code: { title: "تحویل فوری و خودکار", detail: "کد یا اطلاعات ورود، فوراً در حساب کاربری و پیامک", input: null },
  number: { title: "شماره آماده", detail: "شماره و کد تأیید در حساب کاربری", input: null },
};

/** The first demo catalogue (placeholder prices). Kept hidden so old orders, reviews and blog links still resolve; unhide from the admin panel. */
const SAMPLES: Product[] = [
  { id: "claude", hidden: true, tier: "Pro", name: "Claude Pro", maker: "Anthropic", category: "ai", monogram: "CL", group: [[2, 5], [3, 8], [5, 12]], ip: true, etaMinutes: 20,
    description: "برای نوشتن دقیق، کدنویسی و اسناد طولانی", use: "برای متن دقیق و کد تمیز",
    plans: { "1": { own: 2090000 }, "3": { own: 5990000 } },
    includes: ["مدل‌های Claude با سقف استفاده بالاتر", "Projects و Claude Code", "پردازش فایل‌های حجیم"] },
  { id: "gemini", hidden: true, tier: "Pro", name: "Google AI Pro", maker: "Google", category: "ai", monogram: "GE", group: [[2, 5], [3, 8], [5, 12]], ip: true, etaMinutes: 15,
    description: "Gemini به‌همراه ۲ ترابایت فضای ابری", use: "هوش گوگل، کنار Gmail و Docs",
    plans: { "1": { own: 1190000 }, "12": { own: 11900000 } },
    includes: ["Gemini Pro و Deep Research", "۲ ترابایت Google One", "Gemini در Gmail و Docs"] },
  { id: "perplexity", hidden: true, name: "Perplexity Pro", maker: "Perplexity", category: "ai", monogram: "PX", ip: true, etaMinutes: 10,
    description: "جست‌وجوی هوشمند با منبع", use: "جواب دقیق، با منبع",
    plans: { "1": { own: 990000 }, "12": { own: 7900000 } },
    includes: ["جست‌وجوی Pro نامحدود", "انتخاب بین مدل‌های برتر", "تحلیل فایل"] },
  { id: "grok", hidden: true, name: "SuperGrok", maker: "xAI", category: "ai", monogram: "GK", ip: true, etaMinutes: 20,
    description: "مدل‌های پیشرفته Grok", use: "سریع و بی‌پرده",
    plans: { "1": { own: 2190000, ready: 1890000 } },
    includes: ["مدل‌های پیشرفته Grok", "تولید تصویر", "سقف استفاده بالاتر"] },
  { id: "cursor", hidden: true, name: "Cursor Pro", maker: "Anysphere", category: "code", monogram: "CU", group: [[2, 5], [3, 8], [5, 12]], ip: true, etaMinutes: 20,
    description: "ادیتور کد با هوش مصنوعی", use: "کدنویسی با هوش مصنوعی",
    plans: { "1": { own: 1990000 }, "12": { own: 18900000 } },
    includes: ["تکمیل کد نامحدود", "درخواست‌های سریع ماهانه", "Agent و Background Agents"] },
  { id: "copilot", hidden: true, name: "GitHub Copilot", maker: "GitHub", category: "code", monogram: "CO", ip: true, etaMinutes: 20,
    description: "دستیار کدنویسی در IDE", use: "دستیار کد در ادیتور تو",
    plans: { "1": { own: 990000 }, "12": { own: 9500000 } },
    includes: ["تکمیل کد در VS Code و JetBrains", "Copilot Chat", "چند مدل"] },
  { id: "adobe", hidden: true, name: "Creative Cloud", maker: "Adobe", category: "create", monogram: "AD", etaMinutes: 30,
    description: "همه اپ‌های Adobe به‌همراه Firefly", use: "همه ابزارهای خلق Adobe",
    plans: { "1": { own: 3490000 }, "12": { own: 34900000 } },
    includes: ["Photoshop، Illustrator، Premiere و بیشتر", "اعتبار Firefly", "۱۰۰ گیگ فضای ابری"] },
  { id: "canva", hidden: true, name: "Canva Pro", maker: "Canva", category: "create", monogram: "CA", group: [[2, 5], [3, 8], [5, 12]], etaMinutes: 5,
    description: "طراحی سریع با قالب‌های حرفه‌ای", use: "طراحی در چند دقیقه",
    plans: { "1": { own: 390000 }, "12": { own: 2900000 } },
    includes: ["همه قالب‌ها و المان‌های Pro", "Magic Studio", "Brand Kit"] },
  { id: "kling", hidden: true, name: "Kling AI", maker: "Kuaishou", category: "create", monogram: "KL", etaMinutes: 20,
    description: "ساخت ویدئو با هوش مصنوعی", use: "از متن به ویدئو",
    plans: { "1": { own: 1490000 } },
    includes: ["اعتبار ماهانه ساخت ویدئو", "کیفیت حرفه‌ای", "بدون واترمارک"] },
  { id: "notion", hidden: true, name: "Notion Plus", maker: "Notion", category: "work", monogram: "NO", group: [[2, 5], [3, 8], [5, 12]], etaMinutes: 15,
    description: "فضای کار و دانش، همراه Notion AI", use: "نوشتن، برنامه‌ریزی، یادداشت",
    plans: { "1": { own: 890000 }, "12": { own: 8500000 } },
    includes: ["Notion AI", "فضای کاری تیمی", "تاریخچه نسخه‌ها"] },
  { id: "tgpremium", hidden: true, name: "Telegram Premium", maker: "Telegram", category: "telegram", monogram: "TG", etaMinutes: 10,
    description: "امکانات ویژه تلگرام، روی آیدی خودت", use: "تلگرام بدون محدودیت",
    plans: { "3": { username: 1190000 }, "6": { username: 1590000 }, "12": { username: 2790000 } },
    includes: ["آپلود فایل تا ۴ گیگابایت و دانلود سریع‌تر", "تبدیل ویس به متن و بدون تبلیغ", "استیکر، ری‌اکشن و نشان ویژه"] },
  { id: "tgstars", hidden: true, name: "Telegram Stars", maker: "Telegram", category: "telegram", kind: "qty", monogram: "ST", etaMinutes: 10,
    axis: "تعداد استارز", labels: { "100": "۱۰۰ استارز", "250": "۲۵۰ استارز", "500": "۵۰۰ استارز", "1000": "۱۰۰۰ استارز" },
    description: "استارز برای ربات‌ها، کانال‌ها و هدیه", use: "پرداخت داخل تلگرام",
    plans: { "100": { username: 190000 }, "250": { username: 450000 }, "500": { username: 890000 }, "1000": { username: 1750000 } },
    includes: ["خرید در ربات‌ها و مینی‌اپ‌ها", "حمایت از کانال‌ها و پست‌های پولی", "هدیه دادن به دوستان"] },
  { id: "appleid", hidden: true, name: "Apple ID", maker: "Apple", category: "apple", kind: "account", monogram: "AP", etaMinutes: 30,
    axis: "کشور اکانت", labels: { us: "آمریکا", tr: "ترکیه", uk: "انگلیس" },
    description: "اپل آیدی آماده و اختصاصی", use: "ورود به App Store",
    plans: { us: { ready: 390000 }, tr: { ready: 390000 }, uk: { ready: 450000 } },
    includes: ["اکانت تازه با ایمیل جدید، فقط برای تو", "سؤال‌های امنیتی و تاریخ تولد", "مناسب App Store و iCloud همان کشور"] },
  { id: "applegift", hidden: true, name: "Apple Gift Card", maker: "Apple", category: "apple", kind: "gift", monogram: "GC", etaMinutes: 0,
    axis: "مبلغ کارت (آمریکا)", labels: { "5": "۵ دلار", "10": "۱۰ دلار", "25": "۲۵ دلار", "50": "۵۰ دلار" },
    description: "گیفت‌کارت اپل آمریکا از منبع رسمی", use: "شارژ اپل آیدی",
    plans: { "5": { code: 520000 }, "10": { code: 1020000 }, "25": { code: 2520000 }, "50": { code: 4990000 } },
    includes: ["کد قانونی از منبع رسمی", "تحویل خودکار در حساب کاربری", "برای اپ، بازی، iCloud و اشتراک‌ها"] },
  { id: "vnumber", hidden: true, name: "Virtual Number", maker: "AccDrop", category: "number", kind: "number", monogram: "VN", etaMinutes: 0,
    axis: "کشور شماره", labels: { us: "آمریکا", uk: "انگلیس", ca: "کانادا", nl: "هلند" },
    description: "شماره مجازی برای تلگرام و واتس‌اپ", use: "ثبت‌نام بدون سیم‌کارت",
    plans: { ca: { number: 250000 }, us: { number: 290000 }, uk: { number: 390000 }, nl: { number: 450000 } },
    includes: ["شماره اختصاصی برای ثبت‌نام", "کد تأیید در حساب کاربری", "اگر کد نیامد، کل مبلغ برمی‌گردد"] },
  // ----- Variants (one page each, grouped on the product page by `family`) -----
  { id: "chatgpt-go", hidden: true, family: "chatgpt", tier: "Go", name: "ChatGPT Go", maker: "OpenAI", category: "ai", monogram: "GO", etaMinutes: 10,
    description: "نسخه اقتصادی ChatGPT با سقف بالاتر از رایگان", use: "برای استفاده روزمره، ارزان",
    plans: { "1": { own: 690000 }, "3": { own: 1950000 } },
    includes: ["سقف پیام و تصویر بالاتر از نسخه رایگان", "حافظه طولانی‌تر", "آپلود فایل بیشتر"] },
  { id: "chatgpt-pro", hidden: true, family: "chatgpt", tier: "Pro", name: "ChatGPT Pro", maker: "OpenAI", category: "ai", monogram: "PRO", etaMinutes: 30, ip: true,
    description: "قوی‌ترین نسخه ChatGPT برای کار سنگین", use: "برای کار حرفه‌ای بدون سقف",
    plans: { "1": { own: 19900000 } },
    includes: ["استفاده تقریباً نامحدود از مدل‌ها", "حالت Pro برای سخت‌ترین سؤال‌ها", "Deep Research و Agent با سقف بالا"] },
  { id: "claude-max", hidden: true, family: "claude", tier: "Max", name: "Claude Max", maker: "Anthropic", category: "ai", monogram: "MAX", etaMinutes: 30, ip: true,
    description: "Claude با ۵ برابر سقف Pro", use: "برای کدنویسی و کار سنگین",
    plans: { "1": { own: 9900000 } },
    includes: ["۵ برابر سقف استفاده Pro", "Claude Code با سقف بالا", "دسترسی زودتر به امکانات تازه"] },
  { id: "gemini-ultra", hidden: true, family: "gemini", tier: "Ultra", name: "Google AI Ultra", maker: "Google", category: "ai", monogram: "UL", etaMinutes: 30,
    description: "بالاترین سطح Gemini به‌همراه ۳۰ ترابایت فضا", use: "همه هوش گوگل، بدون سقف",
    plans: { "1": { own: 24500000 } },
    includes: ["Gemini با بالاترین سقف و Deep Think", "ساخت ویدئو با Veo", "۳۰ ترابایت فضای ابری"] },
];

/** Real catalogue: official codes and ready accounts from Insight Store, bought and delivered automatically after payment.
 *  `ix` maps each option to its supplier product id. Real prices are set in USDT (USDT_PRICE below) and converted at the
 *  live Tether rate (lib/server/catalog.ts), so the margin over the supplier's USDT cost stays the same. */
const REAL: Product[] = [
  { id: "chatgpt", tier: "Plus", name: "ChatGPT Plus", maker: "OpenAI", category: "ai", monogram: "GPT", badge: "پرفروش", etaMinutes: 0, warranty: "۲۵ روز گارانتی",
    description: "اکانت آماده ChatGPT Plus، تحویل فوری", use: "برای نوشتن، فکر کردن و ساختن",
    plans: { "1": { code: 1190000 } }, ix: { "1": 117 },
    deliver: "بلافاصله بعد از پرداخت، ایمیل، رمز و کلید ورود دومرحله‌ای (2FA) یک اکانت Plus در حساب کاربری‌ات نمایش داده و پیامک می‌شود. کلید 2FA را تغییر نده و فقط روی یک دستگاه وارد شو.",
    howTo: "با ایمیل و رمز وارد شو و کد تأیید را با کلید 2FA در یک اپ Authenticator بساز.",
    includes: ["اکانت Plus با ایمیل و رمز", "تحویل خودکار و فوری", "۲۵ روز گارانتی"] },
  { id: "manus", name: "Manus Pro", maker: "Manus", category: "ai", monogram: "MA", etaMinutes: 0, warranty: "یک سال گارانتی کامل",
    description: "ایجنت هوش مصنوعی که کار را از اول تا آخر انجام می‌دهد", use: "کارها را به ایجنت بسپار",
    plans: { "12": { code: 6890000 } }, ix: { "12": 87 },
    howTo: "در اکانت Manus پلن Pro سالانه (۴۰۰۰ اعتبار) را انتخاب کن و کد را در صفحه پرداخت وارد کن.",
    includes: ["۴۰۰۰ اعتبار در ماه", "کد رسمی روی اکانت خودت", "یک سال گارانتی کامل"] },
  { id: "elevenlabs", name: "ElevenLabs Creator", maker: "ElevenLabs", category: "ai", monogram: "11", etaMinutes: 0, warranty: "تحویل سالم یا جایگزینی",
    description: "صداگذاری و تبدیل متن به گفتار با هوش مصنوعی", use: "صدای طبیعی، به هر زبان",
    plans: { "3": { code: 1190000 } }, ix: { "3": 46 },
    deliver: "بلافاصله بعد از پرداخت، اطلاعات ورود یک اکانت آماده Creator در حساب کاربری‌ات نمایش داده و پیامک می‌شود.",
    howTo: "با اطلاعات تحویلی وارد elevenlabs.io شو و شروع کن.",
    includes: ["۱۳۱ هزار اعتبار در ماه", "اکانت آماده، تحویل فوری", "شبیه‌سازی صدا و دوبله"] },
  { id: "lovable", name: "Lovable Pro", maker: "Lovable", category: "code", monogram: "LO", etaMinutes: 0, warranty: "یک سال گارانتی کامل",
    description: "ساخت اپ و سایت فقط با توضیح دادن", use: "اپ بساز، بدون کدنویسی",
    plans: { "12": { code: 6190000 } }, ix: { "12": 88 },
    howTo: "در اکانت Lovable پلن Pro را با پرداخت ماهانه انتخاب کن و کد را وارد کن؛ تخفیف یک سال اعمال می‌شود.",
    includes: ["۱۰۰ اعتبار در ماه", "کد رسمی روی اکانت خودت", "یک سال گارانتی کامل"] },
  { id: "warp", name: "Warp Build", maker: "Warp", category: "code", monogram: "WA", etaMinutes: 0, warranty: "یک سال گارانتی کامل",
    description: "ترمینال هوشمند با ایجنت کدنویسی", use: "ترمینال، با هوش مصنوعی",
    plans: { "12": { code: 1690000 } }, ix: { "12": 107 },
    howTo: "در اکانت Warp پلن Build را با پرداخت ماهانه انتخاب کن و کد را وارد کن؛ تخفیف یک سال اعمال می‌شود.",
    includes: ["پلن Build یک‌ساله", "کد رسمی روی اکانت خودت", "یک سال گارانتی کامل"] },
  { id: "framer", name: "Framer Pro", maker: "Framer", category: "create", monogram: "FR", etaMinutes: 0, warranty: "کد سالم یا بازگشت وجه",
    description: "طراحی و انتشار سایت بدون کد", use: "سایت حرفه‌ای در یک روز",
    plans: { "12": { code: 1390000 } }, ix: { "12": 4 },
    howTo: "در Framer از Site Settings بخش Plans، پلن Pro سالانه را انتخاب کن و کد را در Add promotion code وارد کن.",
    includes: ["پلن Pro یک‌ساله", "کد رسمی روی اکانت خودت", "تحویل فوری"] },
  { id: "capcut", name: "CapCut Pro", maker: "ByteDance", category: "create", monogram: "CC", etaMinutes: 0, warranty: "گارانتی تا پایان اشتراک",
    description: "تدوین ویدئو برای تولیدکننده محتوا", use: "تدوین ویدئو، حرفه‌ای",
    plans: { "6": { code: 1490000 }, "12": { code: 2890000 } }, ix: { "6": 68, "12": 113 },
    deliver: "بلافاصله بعد از پرداخت، ایمیل و رمز یک اکانت CapCut Pro در حساب کاربری‌ات نمایش داده و پیامک می‌شود. تا ۲ روز ایمیل اکانت را به ایمیل خودت تغییر بده.",
    howTo: "وارد اکانت شو و تا ۲ روز ایمیلش را عوض کن؛ حداکثر روی ۲ دستگاه.",
    includes: ["افکت‌ها، قالب‌ها و ابزارهای هوش مصنوعی", "خروجی 4K بدون واترمارک", "گارانتی تا پایان اشتراک"] },
  { id: "adobe-express", name: "Adobe Express Premium", maker: "Adobe", category: "create", monogram: "AE", group: [[2, 5], [3, 8], [5, 12]], etaMinutes: 0, warranty: "کد سالم یا بازگشت وجه",
    description: "طراحی سریع پست، پوستر و ویدئو کوتاه", use: "طراحی سریع با Firefly",
    plans: { "12": { code: 390000 } }, ix: { "12": 78 },
    howTo: "با اکانت Adobe خودت (جدید یا قدیمی) کد را فعال کن. اگر خطای منطقه دیدی با VPN هند امتحان کن.",
    includes: ["همه قالب‌ها و فونت‌های Premium", "اعتبار Firefly", "بدون نیاز به کارت بانکی"] },
  { id: "linkedin", tier: "Career", name: "LinkedIn Premium", maker: "LinkedIn", category: "work", monogram: "IN", group: [[2, 5], [3, 8], [5, 12]], etaMinutes: 0, warranty: "کد سالم یا بازگشت وجه",
    description: "دیده‌شدن بیشتر و پیام به استخدام‌کننده‌ها", use: "برای پیدا کردن کار بهتر",
    plans: { "3": { code: 690000 } }, ix: { "3": 17 },
    howTo: "کد را روی اکانتی فعال کن که قبلاً هیچ‌وقت Premium نداشته است.",
    includes: ["InMail به استخدام‌کننده‌ها", "دیدن بازدیدکننده‌های پروفایل", "فقط برای اکانت‌هایی که Premium نداشته‌اند"] },
  { id: "linkedin-business", family: "linkedin", tier: "Business", name: "LinkedIn Premium Business", maker: "LinkedIn", category: "work", monogram: "IN", etaMinutes: 0, warranty: "کد سالم یا بازگشت وجه",
    description: "برای شبکه‌سازی و رشد کسب‌وکار در لینکدین", use: "برای شبکه‌سازی حرفه‌ای",
    plans: { "2": { code: 690000 } }, ix: { "2": 114 },
    howTo: "کد را روی اکانتی فعال کن که قبلاً هیچ‌وقت Premium نداشته است.",
    includes: ["جست‌وجوی نامحدود افراد", "InMail و اطلاعات شرکت‌ها", "فقط برای اکانت‌هایی که Premium نداشته‌اند"] },
  { id: "linkedin-sales", family: "linkedin", tier: "Sales Navigator", name: "LinkedIn Sales Navigator", maker: "LinkedIn", category: "work", monogram: "IN", etaMinutes: 0, warranty: "کد سالم یا بازگشت وجه",
    description: "پیدا کردن مشتری و فروش B2B در لینکدین", use: "برای فروش و پیدا کردن مشتری",
    plans: { "2": { code: 890000 } }, ix: { "2": 26 },
    howTo: "کد را روی اکانتی فعال کن که قبلاً هیچ‌وقت Premium نداشته است.",
    includes: ["فیلترهای پیشرفته جست‌وجوی مشتری", "لیست‌های لید و هشدارها", "فقط برای اکانت‌هایی که Premium نداشته‌اند"] },
  { id: "airtable", name: "Airtable Team", maker: "Airtable", category: "work", monogram: "AT", etaMinutes: 0, warranty: "کد سالم یا بازگشت وجه",
    description: "دیتابیس و اتوماسیون تیمی بدون کد", use: "داده و کار تیم، یک‌جا",
    plans: { "12": { code: 990000 } }, ix: { "12": 76 },
    howTo: "در Airtable روی Upgrade بزن، پلن ماهانه Team را انتخاب کن و کد را در صفحه پرداخت وارد کن.",
    includes: ["پلن Team یک‌ساله", "۱۵ هزار اعتبار هوش مصنوعی در ماه", "کد رسمی روی اکانت خودت"] },
  { id: "duolingo", name: "Super Duolingo", maker: "Duolingo", category: "work", monogram: "DU", group: [[2, 5], [3, 8], [5, 12]], etaMinutes: 0, warranty: "کد سالم یا بازگشت وجه",
    description: "یادگیری زبان بدون تبلیغ و محدودیت", use: "زبان یاد بگیر، بی‌وقفه",
    plans: { "12": { code: 490000 } }, ix: { "12": 75 },
    deliver: "بلافاصله بعد از پرداخت، لینک فعال‌سازی یک‌ساله در حساب کاربری‌ات نمایش داده و پیامک می‌شود. بدون کارت بانکی، با یک کلیک روی اکانت خودت.",
    howTo: "در مرورگر وارد اکانت Duolingo شو، لینک را باز کن و Claim Offer را بزن. اگر خطای منطقه دیدی با VPN هند امتحان کن.",
    includes: ["بدون تبلیغ", "قلب نامحدود", "روی اکانت خودت، بدون کارت بانکی"] },
  { id: "nordvpn", name: "NordVPN", maker: "Nord Security", category: "work", monogram: "NV", group: [[2, 5], [3, 8], [5, 12]], etaMinutes: 0, warranty: "۳ ماه گارانتی کامل",
    description: "وی‌پی‌ان سریع و امن روی اکانت خودت", use: "اینترنت امن و آزاد",
    plans: { "3": { code: 590000 } }, ix: { "3": 36 },
    howTo: "کد را روی اکانت NordVPN خودت فعال کن.",
    includes: ["سرور در بیش از ۶۰ کشور", "روی ۱۰ دستگاه همزمان", "گارانتی کامل ۳ ماهه"] },
];


/** Fallback Toman per USDT, used only when no live rate is available (set CRYPTO_RATE_TOMAN to change it on the server). */
export const BASE_RATE = 270_000;
/** Toman price of a USDT amount at `rate`, rounded up to 10,000 Toman. */
export const tomanAt = (usdt: number, rate: number) => Math.ceil((usdt * rate) / 10_000) * 10_000;
/** Selling price in USDT per option. Supplier cost in the comment; roughly +25–35% on larger items, more on sub-$2 codes. */
const USDT_PRICE: Record<string, Record<string, number>> = {
  chatgpt: { "1": 9.9 },            // 7.5
  manus: { "12": 62 },              // 50
  elevenlabs: { "3": 9.5 },         // 7
  lovable: { "12": 56 },            // 45
  warp: { "12": 15.5 },             // 12
  framer: { "12": 10.9 },           // 8
  capcut: { "6": 14.5, "12": 28 },  // 11, 22
  "adobe-express": { "12": 2 },     // 0.5
  linkedin: { "3": 3.5 },           // 1
  "linkedin-business": { "2": 3.5 },// 1
  "linkedin-sales": { "2": 4.5 },   // 1.5
  airtable: { "12": 7.5 },          // 5
  duolingo: { "12": 2.2 },          // 0.5
  nordvpn: { "3": 4.5 },            // 2.5
};
for (const p of REAL) {
  p.usdt = USDT_PRICE[p.id];
  for (const [k, v] of Object.entries(p.usdt ?? {})) p.plans[k] = { ...p.plans[k], code: tomanAt(v, BASE_RATE) };
}

/** Limited-price weekly drops, shown as a slider on the home page. Empty until real offers are set. */
const DROP_LIST: Drop[] = [];
/** Drops of products that are on sale right now. */
export const liveDrops = () => DROP_LIST.filter((d) => PRODUCTS.some((p) => p.id === d.productId && p.plans[d.plan]?.[d.type]));
export const currentDrop = (): Drop | undefined => liveDrops()[0];
export const dropOf = (id: string) => liveDrops().find((d) => d.productId === id);

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
export const ALL_PRODUCTS: Product[] = [...REAL, ...SAMPLES];
export const PRODUCTS: Product[] = ALL_PRODUCTS.filter((p) => !p.hidden);
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
  const d = liveDrops().find((x) => x.productId === sel.id && x.plan === sel.plan && x.type === sel.type);
  if (d) return { price: d.price, was: base };
  return { price: base };
}

/** What each delivery method means, in plain words, for this product. */
export function deliveryExplain(p: Product, t: DeliveryType) {
  switch (t) {
    case "own": return `ایمیل اکانت ${p.maker} خودت را می‌دهی و اشتراک روی همان فعال می‌شود. رمز نمی‌خواهیم و تاریخچه‌ات می‌ماند.`;
    case "ready": return isSub(p) ? "یک اکانت تازه با ایمیل و رمز تحویل می‌گیری که فقط مال توست. ارزان‌تر و سریع‌تر است." : "یک اکانت تازه با ایمیل، رمز و اطلاعات امنیتی تحویل می‌گیری که فقط مال توست و می‌توانی رمزش را عوض کنی.";
    case "username": return "فقط یوزرنیم تلگرامت را وارد می‌کنی و به‌صورت هدیه روی همان آیدی فعال می‌شود. نه کد ورود می‌خواهیم، نه رمز.";
    case "code": return p.deliver ?? (kindOf(p) === "gift"
      ? "بلافاصله بعد از پرداخت، کد گیفت‌کارت در حساب کاربری‌ات نمایش داده و پیامک می‌شود. کد را در App Store وارد می‌کنی و تمام."
      : `بلافاصله بعد از پرداخت، کد رسمی در حساب کاربری‌ات نمایش داده و پیامک می‌شود و آن را روی اکانت ${p.maker} خودت فعال می‌کنی.`);
    case "number": return "بعد از پرداخت، شماره در حساب کاربری‌ات نمایش داده می‌شود. در تلگرام یا واتس‌اپ واردش می‌کنی و کد تأیید همان‌جا می‌آید.";
  }
}

/** One-line promise used on product pages. */
export const guaranteeOf = (p: Product) => p.warranty ??
  ({ sub: "تا روز آخر اشتراک", gift: "کد سالم یا بازگشت وجه", account: "تحویل سالم یا جایگزینی", qty: "دریافت کامل یا بازگشت وجه", number: "کد نیامد؟ بازگشت وجه" })[kindOf(p)];


/** When the sample prices were last reviewed (shown on product pages). */
export const PRICES_UPDATED = { fa: "آبان ۱۴۰۵", iso: "2026-11-01" };

/** The id that owns a product's brand (logo, colours, page copy fallbacks). */
export const brandOf = (p: Pick<Product, "id" | "family">) => p.family ?? p.id;
/** All variants of a product's family, cheapest first (just the product when it has none). */
export const variantsOf = (p: Product) => {
  const fam = brandOf(p);
  return PRODUCTS.filter((x) => brandOf(x) === fam).sort((a, b) => minPrice(a) - minPrice(b));
};
/** Products shown in listings: one card per family. */
export const listed = () => PRODUCTS.filter((p) => !p.family || !PRODUCTS.some((x) => x.id === p.family));
/** «Go · Plus · Pro» for a family card, or "". */
export const tiersLabel = (p: Product) => {
  const v = variantsOf(p);
  return v.length > 1 ? v.map((x) => x.tier ?? splitTier(x.name)).join(" · ") : "";
};
const splitTier = (name: string) => name.split(" ").slice(-1)[0];
