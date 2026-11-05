// Product catalogue (prices in Toman). Admin edits are layered on top by lib/catalog-sync.ts.
import { duration, fa } from "./format";
import { livePlan, livePlanLabel } from "./numbers";

/** How a purchase reaches the customer. */
export type DeliveryType = "own" | "ready" | "shared" | "username" | "code" | "number";
export type Category = "ai" | "code" | "api" | "create" | "work" | "apple" | "music" | "game" | "telegram" | "number";
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
  /** Wholesale: [minimum quantity, percent off each unit], ascending. One line then carries up to MAX_QTY units
   *  (stored in `seats`) and delivers that many codes or accounts. */
  bulk?: [number, number][];
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
  /** Per-product names of delivery methods, e.g. «آماده ۲۰۱۸» and «سفارشی» for Apple ID. `explain` replaces the long text. */
  types?: Partial<Record<DeliveryType, { title: string; detail: string; explain?: string }>>;
  /** What the customer receives, replacing the generic text of the delivery method. */
  deliver?: string;
  /** The last step after delivery: how to redeem or use what was delivered. */
  howTo?: string;
  /** Short warranty line when it differs from the default promise, e.g. «۲۵ روز گارانتی». */
  warranty?: string;
  /** Cryptorefills gift card per option: brand name, fixed denomination («10 USD») or a range value, and our cost in USDT. */
  cr?: Record<string, { brand: string; denom?: string; value?: number; cost: number }>;
  /** QuickDigi product per option: its P_ id and our cost in USDT. Paid lines are bought and delivered automatically. */
  qd?: Record<string, { id: string; cost: number }>;
  /** Canboso product per option: its product id and our cost in USD. Paid lines are bought and delivered automatically. */
  cb?: Record<string, { id: string; cost: number }>;
  /** Replaces «اشتراک رسمی» / «رسمی و قانونی» on the product page when the item is not from the maker itself. */
  source?: string;
  /** What «own» activation asks for when it is not the account email, e.g. Claude's Organization ID. */
  ask?: { label: string; placeholder: string; hint: string; pattern: string; short: string };
  /** Selling price in USDT per option (every delivery type of that option, or per type). When set, the Toman price follows the live Tether rate. */
  usdt?: Record<string, number | Partial<Record<DeliveryType, number>>>;
  /** Options the supplier can't deliver right now, as «plan|type» (set by the automatic supplier sync, never in code). */
  out?: string[];
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
  api: "API و اعتبار",
  create: "طراحی و ویدئو",
  work: "کار و آموزش",
  apple: "اپل و گیفت‌کارت",
  music: "موزیک",
  game: "گیم",
  telegram: "تلگرام",
  number: "شماره مجازی",
};

/** `input` = what we ask the customer for at checkout. */
export const DELIVERY: Record<DeliveryType, { title: string; detail: string; input: "email" | "username" | null }> = {
  own: { title: "روی ایمیل خودم", detail: "روی اکانت شخصی خودت فعال می‌شود", input: "email" },
  ready: { title: "اکانت آماده", detail: "یک اکانت تازه، فقط برای تو", input: null },
  shared: { title: "اکانت آماده اشتراکی", detail: "اکانت مشترک با چند نفر؛ ارزان‌تر", input: null },
  username: { title: "روی آیدی تلگرام", detail: "فقط یوزرنیم لازم است؛ ورود و رمز نمی‌خواهیم", input: "username" },
  code: { title: "تحویل خودکار", detail: "بعد از پرداخت، در صفحه سفارش و پیامک", input: null },
  number: { title: "شماره آماده", detail: "شماره و کد تأیید در حساب کاربری", input: null },
};

/** The first demo catalogue (placeholder prices). Kept hidden so old orders, reviews and blog links still resolve; unhide from the admin panel. */
const SAMPLES: Product[] = [
  // Claude Pro and Max: activated by the admin on the customer's own account, from its Organization ID.
  { id: "claude", tier: "Pro", name: "Claude Pro", maker: "Anthropic", category: "ai", monogram: "CL", ip: true, etaMinutes: 120, warranty: "گارانتی تا پایان اشتراک",
    description: "Claude Pro روی اکانت خودت، با Organization ID", use: "برای متن دقیق و کد تمیز",
    plans: { "1": { own: 0 }, "3": { own: 0 } }, usdt: { "1": 24.9, "3": 72.9 }, ask: { label: "Organization ID اکانت Claude تو", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", hint: "در claude.ai از Settings › Account، مقدار Organization ID را کپی کن. رمز و ورود نمی‌خواهیم.", pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", short: "Organization ID" }, types: { own: { title: "روی اکانت Claude خودت", detail: "فقط با Organization ID؛ رمز و ورود نمی‌خواهیم" } },
    howTo: "در claude.ai وارد اکانتت شو؛ بعد از فعال‌سازی، پلن Pro را در Settings › Billing می‌بینی.",
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
  // Sold the way Iranian shops offer it: what it is for and how long the warranty lasts, ready (made in 2018, instant
  // from our stock, single or wholesale) or made to order with a new personal email. Priced just under competitors
  // (Nov 2026: ready 380–440k, made to order 420–480k).
  { id: "appleid", name: "Apple ID", maker: "Apple", category: "apple", kind: "account", monogram: "AP", etaMinutes: 0, badge: "عمده",
    axis: "نوع و گارانتی", labels: { life: "iCloud مادام‌العمر", icloud: "iCloud ۳۰ روزه", store: "App Store ۳۰ روزه" },
    description: "اپل آیدی آماده یا سفارشی با گارانتی، تکی یا عمده برای موبایل‌فروشی‌ها", use: "App Store و iCloud",
    plans: {
      life: { code: 429000, ready: 469000 },
      icloud: { code: 409000, ready: 429000 },
      store: { code: 369000, ready: 409000 },
    },
    types: {
      code: { title: "آماده (ساخت ۲۰۱۸)", detail: "تحویل فوری و خودکار؛ تکی یا عمده" },
      ready: { title: "سفارشی", detail: "با ایمیل شخصی تازه، معمولاً تا چند ساعت",
        explain: "یک اپل آیدی تازه با ایمیل شخصی جدید فقط برای تو می‌سازیم. ایمیل، رمزها، سؤال‌های امنیتی و تاریخ تولد را در حساب کاربری‌ات تحویل می‌گیری و اکانت کاملاً مال خودت است." },
    },
    bulk: [[5, 8], [10, 12], [25, 18], [50, 25]],
    deliver: "بلافاصله بعد از پرداخت، ایمیل و رمز اپل آیدی، رمز ایمیل، سؤال‌های امنیتی و تاریخ تولد در حساب کاربری‌ات نمایش داده و پیامک می‌شود. در خرید عمده هر اکانت در یک خط جداست.",
    howTo: "اکانت‌های App Store را فقط در Settings › Media & Purchases وارد کن، نه در iCloud بالای تنظیمات. اکانت‌های iCloud را می‌توانی در iCloud هم وارد کنی. بعد از ورود، رمز را عوض کن.",
    warranty: "گارانتی ۳۰ روزه یا مادام‌العمر",
    includes: ["آماده ۲۰۱۸ یا سفارشی با ایمیل شخصی", "سؤال‌های امنیتی و تاریخ تولد", "اکانت آماده: تکی یا عمده تا ۱۰۰ عدد"] },
  // Live 5sim numbers (lib/server/fivesim.ts): countries and prices come from 5sim; the plan below is only the
  // «از …» price shown in listings and is never sold (see priceLines).
  { id: "vnumber", name: "Virtual Number", maker: "AccDrop", category: "number", kind: "number", monogram: "VN", etaMinutes: 0,
    axis: "کشور شماره", labels: { from: "بیش از ۱۰۰ کشور" },
    description: "شماره مجازی برای تلگرام، واتس‌اپ و بیش از ۱۰ سرویس دیگر", use: "ثبت‌نام بدون سیم‌کارت",
    plans: { from: { number: 40000 } },
    includes: ["شماره اختصاصی از بیش از ۱۰۰ کشور", "کد تأیید در همان صفحه سفارش", "کد نیامد؟ شماره جدید یا بازگشت وجه"] },
  // ----- Variants (one page each, grouped on the product page by `family`) -----
  // ChatGPT Go, Business and Pro come from QuickDigi. Go is bought automatically. Options at or above 15 USDT can't be
  // bought through the API, so the admin buys them in the QuickDigi Telegram bot (same Wallet) and enters the delivery:
  // ChatGPT Pro P_11164, ChatGPT Business P_10216 (customer email), Cursor Ultra P_11143,
  // Google AI Ultra P_11105/6/7/8 (1/3/6/12M), Ultra Basic P_11103/4 (3/12M), Ultra Private P_11119 (all customer email),
  // Notion Business P_10209 (customer email), ChatGPT Plus on own account: CDK P_11142, ElevenLabs 3M/7M P_10322/P_10321.
  { id: "chatgpt-go", family: "chatgpt", tier: "Go", name: "ChatGPT Go", maker: "OpenAI", category: "ai", monogram: "GO", etaMinutes: 5, warranty: "۳ روز گارانتی",
    description: "نسخه اقتصادی ChatGPT، سه ماه، اکانت آماده", use: "برای استفاده روزمره، ارزان",
    plans: { "3": { code: 0 } }, usdt: { "3": 5.9 }, qd: { "3": { id: "P_11190", cost: 3.97 } },
    deliver: "ایمیل، رمز و کلید 2FA یک اکانت آماده بعد از پرداخت، معمولاً ظرف چند دقیقه خودکار در حساب کاربری‌ات نمایش داده و پیامک می‌شود.",
    howTo: "وارد شو، یک Passkey اضافه کن و بعد رمز و 2FA را عوض کن.",
    includes: ["سقف پیام و تصویر بالاتر از نسخه رایگان", "حافظه طولانی‌تر و آپلود فایل بیشتر", "سه ماه، با قیمت کمتر از Plus"] },
  { id: "chatgpt-pro", family: "chatgpt", tier: "Pro", name: "ChatGPT Pro", maker: "OpenAI", category: "ai", monogram: "PRO", etaMinutes: 720, warranty: "۷ روز گارانتی پلن",
    description: "قوی‌ترین نسخه ChatGPT برای کار سنگین، اکانت آماده یک‌ماهه", use: "برای کار حرفه‌ای بدون سقف",
    plans: { "1": { ready: 0 } }, usdt: { "1": 79 },
    deliver: "اکانت Pro مخصوص تو ساخته و فعال می‌شود؛ بین ۱ تا ۲۴ ساعت. اطلاعات ورود در حساب کاربری‌ات نمایش داده و پیامک می‌شود.",
    includes: ["استفاده تقریباً نامحدود از مدل‌ها", "حالت Pro برای سخت‌ترین سؤال‌ها", "Deep Research، Codex و Agent با سقف بالا"] },
  { id: "chatgpt-business", family: "chatgpt", tier: "Business", name: "ChatGPT Business", maker: "OpenAI", category: "ai", monogram: "BIZ", etaMinutes: 720, warranty: "گارانتی تا پایان اشتراک",
    description: "ChatGPT Business (Team) روی ایمیل خودت، یک ماه", use: "برای کار تیمی و داده‌های امن",
    plans: { "1": { own: 0 } }, usdt: { "1": 23.9 },
    deliver: "ایمیل ChatGPT تو به یک فضای کاری Business اضافه می‌شود؛ معمولاً ظرف چند ساعت. دعوت‌نامه به همان ایمیل می‌آید.",
    howTo: "دعوت‌نامه را از ایمیلت قبول کن و در ChatGPT فضای کاری Business را انتخاب کن. برای تمدید، ۳ تا ۵ روز قبل از پایان خبر بده.",
    includes: ["سقف بالاتر از Plus", "داده‌هایت برای آموزش مدل استفاده نمی‌شود", "روی اکانت و ایمیل خودت"] },
  { id: "claude-max", family: "claude", tier: "Max 5x", name: "Claude Max 5x", maker: "Anthropic", category: "ai", monogram: "MAX", etaMinutes: 120, ip: true, warranty: "گارانتی تا پایان اشتراک",
    description: "Claude با ۵ برابر سقف Pro، روی اکانت خودت", use: "برای کدنویسی و کار سنگین",
    plans: { "1": { own: 0 } }, usdt: { "1": 119 }, ask: { label: "Organization ID اکانت Claude تو", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", hint: "در claude.ai از Settings › Account، مقدار Organization ID را کپی کن. رمز و ورود نمی‌خواهیم.", pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", short: "Organization ID" }, types: { own: { title: "روی اکانت Claude خودت", detail: "فقط با Organization ID؛ رمز و ورود نمی‌خواهیم" } },
    includes: ["۵ برابر سقف استفاده Pro", "Claude Code با سقف بالا", "دسترسی زودتر به امکانات تازه"] },
  { id: "claude-max-20", family: "claude", tier: "Max 20x", name: "Claude Max 20x", maker: "Anthropic", category: "ai", monogram: "MAX", etaMinutes: 120, ip: true, warranty: "گارانتی تا پایان اشتراک",
    description: "Claude با ۲۰ برابر سقف Pro، روی اکانت خودت", use: "برای استفاده تمام‌وقت از Claude Code",
    plans: { "1": { own: 0 } }, usdt: { "1": 229 }, ask: { label: "Organization ID اکانت Claude تو", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", hint: "در claude.ai از Settings › Account، مقدار Organization ID را کپی کن. رمز و ورود نمی‌خواهیم.", pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", short: "Organization ID" }, types: { own: { title: "روی اکانت Claude خودت", detail: "فقط با Organization ID؛ رمز و ورود نمی‌خواهیم" } },
    includes: ["۲۰ برابر سقف استفاده Pro", "Claude Code تمام‌روز", "اولویت در ساعت‌های شلوغ"] },
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
    description: "ChatGPT Plus یک‌ماهه: اکانت آماده اختصاصی، اکانت اشتراکی یا روی اکانت خودت", use: "برای نوشتن، فکر کردن و ساختن",
    plans: { "1": { code: 1190000, shared: 0, own: 0 } }, ix: { "1": 117 },
    types: {
      code: { title: "آماده اختصاصی", detail: "اکانت Plus فقط برای تو؛ تحویل فوری و خودکار" },
      shared: { title: "آماده اشتراکی", detail: "اکانت Plus مشترک با چند نفر؛ ارزان‌ترین", explain: "اطلاعات ورود یک اکانت Plus مشترک (با چند نفر دیگر) معمولاً ظرف چند ساعت در حساب کاربری‌ات نمایش داده و پیامک می‌شود. رمز را عوض نکن؛ گفتگوهایت برای بقیه هم دیده می‌شود." },
      own: { title: "روی اکانت خودت", detail: "Plus روی اکانت ChatGPT خودت؛ تاریخچه‌ات می‌ماند", explain: "بعد از پرداخت، کد فعال‌سازی Plus (CDK) معمولاً ظرف چند ساعت در حساب کاربری‌ات نمایش داده و پیامک می‌شود. با آن روی اکانت ChatGPT خودت در cdk.gpt2fa.com در چند ثانیه Plus می‌گیری؛ نه رمز می‌خواهیم، نه ورود به اکانتت. ۳۰ روز گارانتی پلن." },
    },
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
    plans: { "1": { code: 790000 }, "3": { code: 0 }, "6": { code: 1490000 }, "12": { code: 2890000 } }, ix: { "6": 68, "12": 113 }, qd: { "1": { id: "P_10017", cost: 1.89 } },
    cb: { "3": { id: "6ae8b1e95edeecad99de7819", cost: 7.72 } },
    deliver: "بلافاصله بعد از پرداخت، ایمیل و رمز یک اکانت CapCut Pro در حساب کاربری‌ات نمایش داده و پیامک می‌شود. تا ۲ روز ایمیل اکانت را به ایمیل خودت تغییر بده.",
    howTo: "وارد اکانت شو و تا ۲ روز ایمیلش را عوض کن؛ حداکثر روی ۲ دستگاه.",
    includes: ["افکت‌ها، قالب‌ها و ابزارهای هوش مصنوعی", "خروجی 4K بدون واترمارک", "گارانتی تا پایان اشتراک"] },
  { id: "adobe-express", name: "Adobe Express Premium", maker: "Adobe", category: "create", monogram: "AE", group: [[2, 5], [3, 8], [5, 12]], etaMinutes: 0, warranty: "کد سالم یا بازگشت وجه",
    description: "طراحی سریع پست، پوستر و ویدئو کوتاه", use: "طراحی سریع با Firefly",
    plans: { "12": { code: 390000 } }, ix: { "12": 78 },
    howTo: "با اکانت Adobe خودت (جدید یا قدیمی) کد را فعال کن. اگر خطای منطقه دیدی، به پشتیبانی پیام بده.",
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
    howTo: "در مرورگر وارد اکانت Duolingo شو، لینک را باز کن و Claim Offer را بزن. اگر خطای منطقه دیدی، به پشتیبانی پیام بده.",
    includes: ["بدون تبلیغ", "قلب نامحدود", "روی اکانت خودت، بدون کارت بانکی"] },
];


/** Fallback Toman per USDT, used only when no live rate is available (set CRYPTO_RATE_TOMAN to change it on the server). */
export const BASE_RATE = 270_000;
/** Toman price of a USDT amount at `rate`, rounded up to 10,000 Toman. */
export const tomanAt = (usdt: number, rate: number) => Math.ceil((usdt * rate) / 10_000) * 10_000;
/** A plan with every delivery type priced from `usdt` at `rate`. */
export const planAt = (plan: Partial<Record<DeliveryType, number>> | undefined, usdt: number | Partial<Record<DeliveryType, number>>, rate: number) =>
  Object.fromEntries(Object.keys(plan ?? (typeof usdt === "number" ? { code: 0 } : usdt)).map((t) => {
    const v = typeof usdt === "number" ? usdt : usdt[t as DeliveryType];
    return [t, v ? tomanAt(v, rate) : plan?.[t as DeliveryType] ?? 0];
  })) as Partial<Record<DeliveryType, number>>;
/** The field «own» activation asks for on this product, and whether a value is valid. */
export const ownAsk = (p: Product) => p.ask ?? { label: `ایمیل اکانت ${p.maker} تو`, placeholder: "you@gmail.com", hint: "فقط ایمیل. هیچ‌وقت رمز عبورت را نمی‌خواهیم.", pattern: "^\\S+@\\S+\\.\\S+$", short: "ایمیل مشتری" };
export const validOwn = (p: Product, v: string) => new RegExp(ownAsk(p).pattern, "i").test(v.trim());

// ----- Gift cards (Cryptorefills, US region). Bought on-chain per order and delivered automatically. -----
type G = { id: string; name: string; maker: string; category: Category; monogram: string; brand: string; axis?: string;
  description: string; use: string; howTo: string; includes: string[];
  /** option key → [label, denomination or range value, Cryptorefills cost in USDT] */
  opts: [string, string, string | number, number][] };
const usd = (n: number) => `${fa(n)} دلار`;
const GIFTS: G[] = [
  { id: "applegift", name: "Apple Gift Card", maker: "Apple", category: "apple", monogram: "GC", brand: "Everything Apple",
    description: "گیفت‌کارت اپل آمریکا، تحویل فوری", use: "شارژ اپل آیدی",
    howTo: "در App Store روی عکس پروفایل بزن، Redeem Gift Card or Code را انتخاب کن و کد را وارد کن.",
    includes: ["کد رسمی آمریکا", "تحویل خودکار در حساب کاربری", "برای اپ، بازی، iCloud و Apple Music"],
    opts: [["5", usd(5), 5, 5.37], ["10", usd(10), 10, 10.75], ["25", usd(25), 25, 26.87], ["50", usd(50), 50, 53.74]] },
  { id: "googleplay", name: "Google Play Gift Card", maker: "Google", category: "apple", monogram: "GP", brand: "Google Play",
    description: "گیفت‌کارت گوگل‌پلی آمریکا", use: "خرید اپ و بازی اندروید",
    howTo: "در Google Play روی عکس پروفایل بزن، Payments & subscriptions و بعد Redeem code را بزن و کد را وارد کن. اکانت باید ریجن آمریکا باشد.",
    includes: ["کد رسمی آمریکا", "تحویل خودکار", "برای اپ، بازی و اشتراک‌های اندروید"],
    opts: [["5", usd(5), 5, 5.2], ["10", usd(10), 10, 10.4], ["25", usd(25), 25, 26.01], ["50", usd(50), 50, 52.02]] },
  { id: "tidal", name: "Tidal Gift Card", maker: "Tidal", category: "music", monogram: "TI", brand: "Tidal",
    description: "گیفت‌کارت تایدال آمریکا برای پخش موسیقی با کیفیت Hi-Res", use: "موسیقی با بالاترین کیفیت",
    howTo: "با VPN آمریکا به tidal.com/redeem برو، یک اکانت Tidal بساز یا وارد شو (ریجن آمریکا) و کد را وارد کن؛ اعتبار کارت صرف اشتراک ماهانه می‌شود.",
    includes: ["کد رسمی آمریکا", "تحویل خودکار", "پخش Hi-Res و Dolby Atmos، بدون تبلیغ"],
    opts: [["20", usd(20), "20 USD", 20.44], ["60", usd(60), "60 USD", 61.4], ["120", usd(120), "120 USD", 122.8]] },
  { id: "deezer", name: "Deezer Premium", maker: "Deezer", category: "music", monogram: "DZ", brand: "Deezer", axis: "مدت اشتراک (آمریکا)",
    description: "گیفت‌کارت Deezer Premium آمریکا، یک یا سه ماه", use: "موسیقی بدون تبلیغ و آفلاین",
    howTo: "با VPN آمریکا به deezer.com/redeem برو، با اکانت Deezer خودت (یا یک اکانت تازه) وارد شو و کد را وارد کن تا Premium فعال شود.",
    includes: ["کد رسمی آمریکا", "تحویل خودکار", "بدون تبلیغ، دانلود آفلاین و پخش با کیفیت بالا"],
    opts: [["1", "۱ ماه", "10.99 USD", 11.05], ["3", "۳ ماه", "32.97 USD", 33.16]] },
  { id: "steam", name: "Steam Gift Card", maker: "Valve", category: "game", monogram: "ST", brand: "Steam",
    description: "شارژ کیف پول استیم", use: "خرید بازی در استیم",
    howTo: "در store.steampowered.com/account/redeemwalletcode وارد اکانت استیم شو و کد را وارد کن.",
    includes: ["کد رسمی Steam Wallet", "تحویل خودکار", "شارژ مستقیم کیف پول استیم"],
    opts: [["10", usd(10), "10 USD", 11.28], ["20", usd(20), "20 USD", 22.57], ["50", usd(50), "50 USD", 56.42]] },
  { id: "playstation", name: "PlayStation Store", maker: "Sony", category: "game", monogram: "PS", brand: "PlayStation Store",
    description: "گیفت‌کارت پلی‌استیشن آمریکا", use: "بازی و PS Plus",
    howTo: "در PlayStation Store یا کنسول، Redeem Codes را بزن و کد را وارد کن. اکانت باید ریجن آمریکا باشد.",
    includes: ["کد رسمی آمریکا", "تحویل خودکار", "برای بازی، PS Plus و آیتم‌ها"],
    opts: [["25", usd(25), 25, 25.11], ["50", usd(50), 50, 50.22], ["100", usd(100), 100, 100.45]] },
  { id: "xbox", name: "Xbox Gift Card", maker: "Microsoft", category: "game", monogram: "XB", brand: "Xbox",
    description: "گیفت‌کارت ایکس‌باکس آمریکا", use: "بازی و Game Pass",
    howTo: "در xbox.com/redeemcode یا Microsoft Store کد را وارد کن. اکانت باید ریجن آمریکا باشد.",
    includes: ["کد رسمی آمریکا", "تحویل خودکار", "برای بازی و Game Pass"],
    opts: [["10", usd(10), "10 USD", 10.84], ["25", usd(25), "25 USD", 27.1], ["50", usd(50), "50 USD", 54.2]] },
  { id: "nintendo", name: "Nintendo eShop", maker: "Nintendo", category: "game", monogram: "NI", brand: "Nintendo eShop",
    description: "شارژ اکانت نینتندو آمریکا", use: "بازی سوییچ",
    howTo: "در eShop روی پروفایل بزن، Redeem Code را انتخاب کن و کد را وارد کن.",
    includes: ["کد رسمی آمریکا", "تحویل خودکار", "برای بازی‌های Switch"],
    opts: [["10", usd(10), "10 USD", 10.36], ["20", usd(20), "20 USD", 20.71], ["50", usd(50), "50 USD", 51.78]] },
  { id: "razer", name: "Razer Gold", maker: "Razer", category: "game", monogram: "RZ", brand: "Razer Gold USD",
    description: "شارژ Razer Gold برای صدها بازی", use: "آیتم و ارز بازی‌ها",
    howTo: "در gold.razer.com وارد شو، Reload را بزن و کد را وارد کن.",
    includes: ["کد رسمی Razer Gold", "تحویل خودکار", "برای ارز داخل صدها بازی"],
    opts: [["5", usd(5), "5 USD", 5.29], ["10", usd(10), "10 USD", 10.44], ["20", usd(20), "20 USD", 20.75], ["50", usd(50), "50 USD", 51.65]] },
  { id: "pubg", name: "PUBG Mobile UC", maker: "Krafton", category: "game", monogram: "UC", brand: "PUBG Mobile", axis: "تعداد یوسی",
    description: "یوسی پابجی موبایل با کد رسمی", use: "یوسی برای پابجی",
    howTo: "در midasbuy.com/midasbuy/ot/redeem/pubgm آیدی بازی را بزن و کد را وارد کن.",
    includes: ["کد رسمی یوسی", "تحویل خودکار", "شارژ با آیدی بازی، بدون رمز"],
    opts: [["60", "۶۰ یوسی", "60 UC", 1.08], ["325", "۳۲۵ یوسی", "300 + 25 UC", 5.01], ["660", "۶۶۰ یوسی", "600 + 60 UC", 10.03], ["1800", "۱۸۰۰ یوسی", "1500 + 300 UC", 25.1]] },
  { id: "freefire", name: "Free Fire Diamonds", maker: "Garena", category: "game", monogram: "FF", brand: "Free Fire",
    description: "الماس فری‌فایر با کد رسمی", use: "الماس برای فری‌فایر",
    howTo: "در shop.garena.sg یا reward.ff.garena.com با آیدی بازی وارد شو و کد را وارد کن.",
    includes: ["کد رسمی Garena", "تحویل خودکار", "شارژ با آیدی بازی"],
    opts: [["2", usd(2), "2 USD", 2.13], ["5", usd(5), "5 USD", 5.16], ["10", usd(10), "10 USD", 10.2]] },
  { id: "valorant", name: "Valorant Points", maker: "Riot Games", category: "game", monogram: "VP", brand: "Valorant Point (VP)",
    description: "ولورانت پوینت با کد رسمی", use: "اسکین و بتل‌پس",
    howTo: "در بازی روی آیکون VP بزن، Prepaid Cards & Codes را انتخاب کن و کد را وارد کن.",
    includes: ["کد رسمی Riot", "تحویل خودکار", "برای اسکین و Battle Pass"],
    opts: [["5", usd(5), "5 USD", 5.61], ["10", usd(10), "10 USD", 11.09], ["25", usd(25), "25 USD", 27.53]] },
  { id: "roblox", name: "Roblox Gift Card", maker: "Roblox", category: "game", monogram: "RB", brand: "Roblox",
    description: "گیفت‌کارت روبلاکس برای روباکس", use: "روباکس و پریمیوم",
    howTo: "در roblox.com/redeem وارد اکانت شو و کد را وارد کن.",
    includes: ["کد رسمی Roblox", "تحویل خودکار", "تبدیل به روباکس یا Premium"],
    opts: [["10", usd(10), 10, 10.16], ["25", usd(25), 25, 25.39], ["50", usd(50), 50, 50.78]] },
];
/** Our margin on gift cards over the Cryptorefills cost. */
const GIFT_MARKUP = 1.08;
const GIFT_PRODUCTS: Product[] = GIFTS.map((g) => ({
  id: g.id, name: g.name, maker: g.maker, category: g.category, kind: "gift", monogram: g.monogram, etaMinutes: 5,
  axis: g.axis ?? "مبلغ کارت (آمریکا)", labels: Object.fromEntries(g.opts.map(([k, l]) => [k, l])),
  description: g.description, use: g.use, howTo: g.howTo, includes: g.includes, warranty: "کد سالم یا بازگشت وجه",
  deliver: "بعد از پرداخت، کد رسمی معمولاً ظرف چند دقیقه به‌صورت خودکار در حساب کاربری‌ات نمایش داده و پیامک می‌شود.",
  plans: Object.fromEntries(g.opts.map(([k]) => [k, { code: 0 }])),
  usdt: Object.fromEntries(g.opts.map(([k, , , c]) => [k, Math.ceil(c * GIFT_MARKUP * 20) / 20])),
  cr: Object.fromEntries(g.opts.map(([k, , d, c]) => [k, typeof d === "number" ? { brand: g.brand, value: d, cost: c } : { brand: g.brand, denom: d, cost: c }])),
}));
/** Selling price in USDT per option. Supplier cost in the comment; roughly +25–35% on larger items, more on sub-$2 codes. */
const USDT_PRICE: Record<string, NonNullable<Product["usdt"]>> = {
  chatgpt: { "1": { code: 9.9, shared: 4.9, own: 22.9 } }, // 7.5 (Insight) / shared: admin / own: QuickDigi CDK P_11142 17.81 (admin)
  manus: { "12": 62 },              // 50
  elevenlabs: { "3": 9.5 },         // 7
  lovable: { "12": 56 },            // 45
  warp: { "12": 15.5 },             // 12
  framer: { "12": 10.9 },           // 8
  capcut: { "1": 2.9, "3": 11.5, "6": 14.5, "12": 28 }, // 1.89 (QuickDigi), 7.72 (Canboso), 11, 22
  "adobe-express": { "12": 2 },     // 0.5
  linkedin: { "3": 3.5 },           // 1
  "linkedin-business": { "2": 3.5 },// 1
  "linkedin-sales": { "2": 4.5 },   // 1.5
  airtable: { "12": 7.5 },          // 5
  duolingo: { "12": 2.2 },          // 0.5
};
for (const p of REAL) p.usdt = USDT_PRICE[p.id];
REAL.push(...GIFT_PRODUCTS);
/** Products bought from QuickDigi (lib/server/quickdigi.ts): ready accounts and activation codes the store did not have yet.
 *  `qd` maps each option to the QuickDigi product id and its USDT cost; `usdt` is our selling price (roughly +30%).
 *  QuickDigi only automates orders below 15 USDT, so options that cost more are left out. */
const QD_INSTANT = "بعد از پرداخت، معمولاً ظرف چند دقیقه به‌صورت خودکار در حساب کاربری‌ات نمایش داده و پیامک می‌شود.";
const QD_PRODUCTS: Product[] = [
  { id: "google-ai-pro", tier: "Pro", name: "Google AI Pro", maker: "Google", category: "ai", monogram: "GE", etaMinutes: 5, warranty: "گارانتی فعال‌سازی",
    description: "Gemini Pro و ۲ ترابایت فضای ابری، شش ماه روی اکانت گوگل خودت", use: "هوش گوگل، کنار Gmail و Docs",
    plans: { "6": { code: 0 } }, usdt: { "6": 4.9 }, qd: { "6": { id: "P_11185", cost: 2.77 } },
    deliver: "کد فعال‌سازی شش‌ماهه " + QD_INSTANT,
    howTo: "قبل از فعال‌سازی، همه کارت‌ها و پروفایل‌های پرداخت اکانت گوگل را حذف کن و اگر عضو Family هستی خارج شو. بعد در renewgpt.online با اکانت خودت وارد شو و کد را وارد کن (ویدئوی راهنما در همان سایت هست).",
    includes: ["Gemini Pro و Deep Research", "۲ ترابایت Google One", "روی اکانت گوگل خودت، بدون کارت بانکی"] },
  { id: "google-ai-ultra", family: "google-ai-pro", tier: "Ultra", name: "Google AI Ultra", maker: "Google", category: "ai", monogram: "UL", etaMinutes: 1440, warranty: "گارانتی تا پایان اشتراک",
    description: "بالاترین سطح Gemini و ساخت ویدئو با Veo، روی ایمیل خودت (عضو Family)", use: "همه هوش گوگل، بدون سقف",
    plans: { "1": { own: 0 }, "3": { own: 0 }, "6": { own: 0 }, "12": { own: 0 } }, usdt: { "1": 34.9, "3": 64.9, "6": 94.9, "12": 149 },
    deliver: "ایمیل گوگل تو به یک Family اشتراک Ultra اضافه می‌شود (۲۵ هزار اعتبار)؛ بین ۱ تا ۴۸ ساعت. ایمیل را با دقت وارد کن؛ فقط یک بار قابل تغییر است.",
    howTo: "دعوت‌نامه Family را از Gmail قبول کن و Gemini و Flow را باز کن.",
    includes: ["Gemini با بالاترین سقف و Deep Think", "ساخت ویدئو با Veo و ۲۵ هزار اعتبار", "روی اکانت گوگل خودت"] },
  { id: "google-ai-ultra-basic", family: "google-ai-pro", tier: "Ultra Basic", name: "Google AI Ultra Basic", maker: "Google", category: "ai", monogram: "UL", etaMinutes: 1440, warranty: "گارانتی تا پایان اشتراک",
    description: "Gemini Ultra و Veo کم‌اولویت بدون اعتبار، ارزان‌ترین راه Ultra، روی ایمیل خودت", use: "Ultra ارزان، بدون اعتبار ویدئو",
    plans: { "3": { own: 0 }, "12": { own: 0 } }, usdt: { "3": 52.9, "12": 119 },
    deliver: "ایمیل گوگل تو به یک Family اشتراک Ultra اضافه می‌شود؛ بین ۱ تا ۴۸ ساعت. فقط مدل‌های بدون مصرف اعتبار (Veo کم‌اولویت) مجازند؛ استفاده از مدل‌های اعتباری باعث حذف از گروه می‌شود.",
    howTo: "دعوت‌نامه Family را از Gmail قبول کن. در Flow فقط مدل‌های Lower Priority را انتخاب کن.",
    includes: ["Gemini با سقف Ultra", "Veo کم‌اولویت بدون اعتبار", "روی اکانت گوگل خودت"] },
  { id: "google-ai-ultra-private", family: "google-ai-pro", tier: "Ultra Private", name: "Google AI Ultra Private", maker: "Google", category: "ai", monogram: "UL", etaMinutes: 1440, warranty: "گارانتی تا پایان اشتراک",
    description: "Ultra اختصاصی با ۱۰۰ هزار اعتبار Veo، یک ماه، روی ایمیل خودت", use: "برای ساخت ویدئوی زیاد با Veo",
    plans: { "1": { own: 0 } }, usdt: { "1": 149 },
    deliver: "اشتراک Ultra با ۱۰۰ هزار اعتبار فقط برای ایمیل تو فعال می‌شود؛ بین ۱ تا ۴۸ ساعت.",
    howTo: "دعوت‌نامه را از Gmail قبول کن و Gemini و Flow را باز کن.",
    includes: ["۱۰۰ هزار اعتبار Veo", "Gemini با بالاترین سقف و Deep Think", "اختصاصی، روی اکانت گوگل خودت"] },
  { id: "grok-cursor", tier: "Pro", name: "Cursor Pro + SuperGrok", maker: "Anysphere", category: "code", monogram: "CU", badge: "پیشنهاد ویژه", etaMinutes: 5, warranty: "۲۸ روز گارانتی",
    description: "اکانت آماده Cursor پریمیوم به‌همراه Grok پریمیوم، یک ماه", use: "کدنویسی با هوش مصنوعی، به‌همراه Grok",
    plans: { "1": { code: 0 } }, usdt: { "1": 18.9 }, qd: { "1": { id: "P_11149", cost: 14.3 } },
    deliver: "ایمیل، رمز اکانت و رمز ایمیل " + QD_INSTANT,
    howTo: "با ایمیل و رمز وارد grok.com شو؛ Cursor هم با همین ایمیل فعال است. بعد از ورود، رمز را عوض کن و 2FA بگذار.",
    includes: ["Cursor پریمیوم: Agent و تکمیل کد", "مدل‌های پیشرفته Grok", "۲۸ روز گارانتی"] },
  { id: "cursor-ultra", family: "grok-cursor", tier: "Ultra", name: "Cursor Ultra", maker: "Anysphere", category: "code", monogram: "CU", etaMinutes: 720, warranty: "گارانتی پلن",
    description: "Cursor با ۲۰ برابر سقف Pro، اکانت آماده یک‌ماهه", use: "برای کدنویسی سنگین و روزانه",
    plans: { "1": { ready: 0 } }, usdt: { "1": 105 },
    deliver: "اکانت Ultra مخصوص تو فعال می‌شود؛ بین ۱ تا ۲۴ ساعت. اطلاعات ورود در حساب کاربری‌ات نمایش داده و پیامک می‌شود.",
    howTo: "با اطلاعات تحویلی وارد Cursor شو و از همان روز استفاده کن.",
    includes: ["۲۰ برابر سقف استفاده Pro", "دسترسی اولویت‌دار به مدل‌های تازه", "اکانت آماده، فقط برای تو"] },
  { id: "gamma", tier: "Plus", name: "Gamma Plus", maker: "Gamma", category: "work", monogram: "GA", etaMinutes: 5, warranty: "۲۵ روز گارانتی",
    description: "ساخت ارائه، سند و سایت با هوش مصنوعی", use: "اسلاید حرفه‌ای در چند دقیقه",
    plans: { "1": { code: 0 } }, usdt: { "1": 8.9 }, qd: { "1": { id: "P_10156", cost: 6.47 } },
    deliver: "ایمیل و رمز یک اکانت آماده Plus " + QD_INSTANT,
    howTo: "وارد gamma.app شو، رمز را عوض کن و از همه دستگاه‌های دیگر خارج شو.",
    includes: ["ساخت ارائه نامحدود با هوش مصنوعی", "حذف واترمارک Gamma", "۲۵ روز گارانتی پلن"] },
  { id: "gamma-pro", family: "gamma", tier: "Pro", name: "Gamma Pro", maker: "Gamma", category: "work", monogram: "GA", etaMinutes: 5, warranty: "۲۵ روز گارانتی",
    description: "Gamma با مدل‌های پیشرفته و امکانات کامل", use: "ارائه‌های سنگین و برندشده",
    plans: { "1": { code: 0 } }, usdt: { "1": 18.9 }, qd: { "1": { id: "P_10155", cost: 14.5 } },
    deliver: "ایمیل و رمز یک اکانت آماده Pro " + QD_INSTANT,
    howTo: "وارد gamma.app شو، رمز را عوض کن و از همه دستگاه‌های دیگر خارج شو.",
    includes: ["مدل‌های تصویر و متن پیشرفته", "دامنه و برند اختصاصی", "۲۵ روز گارانتی پلن"] },
  { id: "grammarly", name: "Grammarly Edu", maker: "Grammarly", category: "work", monogram: "GR", etaMinutes: 5, warranty: "گارانتی تا پایان اشتراک",
    description: "ویرایش و بازنویسی متن انگلیسی با هوش مصنوعی", use: "انگلیسی بی‌غلط و روان",
    plans: { "1": { code: 0 }, "3": { code: 0 } }, usdt: { "1": 9.9, "3": 15.9 },
    qd: { "1": { id: "P_10227", cost: 7.24 }, "3": { id: "P_10228", cost: 12.24 } },
    deliver: "اطلاعات ورود اکانت آماده (نسخه آموزشی با هوش مصنوعی) " + QD_INSTANT,
    howTo: "با اطلاعات تحویلی وارد grammarly.com شو و افزونه مرورگر یا اپ را نصب کن.",
    includes: ["اصلاح لحن، وضوح و گرامر", "بازنویسی و تولید متن با هوش مصنوعی", "گارانتی تا پایان اشتراک"] },
  { id: "quizlet", name: "Quizlet Plus", maker: "Quizlet", category: "work", monogram: "QZ", etaMinutes: 5, warranty: "گارانتی تا پایان اشتراک",
    description: "فلش‌کارت و آزمون هوشمند برای حفظ لغت و درس", use: "حفظ کردن، سریع‌تر",
    plans: { "12": { code: 0 } }, usdt: { "12": 9.9 }, qd: { "12": { id: "P_10211", cost: 7.24 } },
    deliver: "اطلاعات اکانت Plus یک‌ساله " + QD_INSTANT,
    howTo: "با اطلاعات تحویلی وارد quizlet.com یا اپ Quizlet شو.",
    includes: ["حالت‌های یادگیری و آزمون نامحدود", "بدون تبلیغ و آفلاین", "گارانتی تا پایان اشتراک"] },
  { id: "scribd", name: "Scribd Premium", maker: "Scribd", category: "work", monogram: "SC", etaMinutes: 5, warranty: "گارانتی تا پایان اشتراک",
    description: "میلیون‌ها کتاب، کتاب صوتی و سند", use: "کتابخانه بی‌انتها",
    plans: { "1": { code: 0 } }, usdt: { "1": 2.9 }, qd: { "1": { id: "P_10166", cost: 1.66 } },
    deliver: "ایمیل و رمز یک اکانت Premium " + QD_INSTANT,
    howTo: "با ایمیل و رمز مستقیم وارد scribd.com شو. تعداد دانلود سند در این اکانت‌ها محدود است؛ خواندن آنلاین آزاد است.",
    includes: ["کتاب و کتاب صوتی", "خواندن اسناد Scribd", "دانلود محدود"] },
  { id: "zoom", name: "Zoom Pro", maker: "Zoom", category: "work", monogram: "ZM", etaMinutes: 5, warranty: "۲۵ روز گارانتی",
    description: "جلسه آنلاین بدون محدودیت ۴۰ دقیقه", use: "جلسه و کلاس آنلاین طولانی",
    plans: { "1": { code: 0 } }, usdt: { "1": 4.5 }, qd: { "1": { id: "P_10168", cost: 2.81 } },
    deliver: "اطلاعات ورود یک اکانت آماده Zoom Pro " + QD_INSTANT,
    howTo: "با اطلاعات تحویلی وارد Zoom شو. رمز را عوض نکن تا گارانتی برقرار بماند؛ اگر کد دومرحله‌ای خواست، Skip را بزن.",
    includes: ["جلسه تا ۳۰ ساعت", "ضبط ابری", "۲۵ روز گارانتی"] },
  { id: "microsoft-365", name: "Microsoft 365 Family", maker: "Microsoft", category: "work", monogram: "MS", etaMinutes: 5, warranty: "گارانتی تا پایان اشتراک",
    description: "Word، Excel، PowerPoint و یک ترابایت OneDrive، یک سال", use: "آفیس کامل، برای خودت و خانواده",
    plans: { "12": { code: 0 } }, usdt: { "12": 15.5 }, qd: { "12": { id: "P_10325", cost: 11.8 } },
    deliver: "ایمیل، رمز و ایمیل بازیابی اکانت مدیر Family " + QD_INSTANT,
    howTo: "با ایمیل و رمز وارد اپ‌های آفیس شو و تا ۵ نفر را به Family اضافه کن. رمز و ایمیل بازیابی را عوض نکن؛ تمدید ماهانه خودکار با همین اطلاعات انجام می‌شود.",
    includes: ["Word، Excel، PowerPoint و Outlook", "۱ ترابایت OneDrive", "تا ۵ عضو خانواده"] },
  { id: "figma", name: "Figma Education", maker: "Figma", category: "create", monogram: "FG", etaMinutes: 5, warranty: "گارانتی تا پایان اشتراک",
    description: "طراحی رابط کاربری و نمونه‌سازی تیمی، یک سال (نسخه آموزشی)", use: "طراحی UI، حرفه‌ای",
    plans: { "12": { code: 0 } }, usdt: { "12": 16.5 }, qd: { "12": { id: "P_10161", cost: 12.62 } },
    deliver: "اطلاعات اکانت Figma آموزشی یک‌ساله " + QD_INSTANT,
    howTo: "با اطلاعات تحویلی وارد figma.com شو.",
    includes: ["پروژه و فایل نامحدود", "Dev Mode و کتابخانه تیمی", "گارانتی تا پایان اشتراک"] },
  { id: "autocad", name: "AutoCAD (آموزشی)", maker: "Autodesk", category: "create", monogram: "AC", etaMinutes: 5, warranty: "گارانتی تا پایان اشتراک",
    description: "اکانت آموزشی Autodesk با دسترسی به AutoCAD، یک سال", use: "نقشه‌کشی و طراحی مهندسی",
    plans: { "12": { code: 0 } }, usdt: { "12": 9.9 }, qd: { "12": { id: "P_10368", cost: 7.24 } },
    deliver: "اطلاعات ورود اکانت Autodesk (آموزشی تأییدشده) و رمز ایمیل آن " + QD_INSTANT,
    howTo: "با اطلاعات تحویلی وارد autodesk.com شو و AutoCAD را از بخش Education دانلود کن.",
    includes: ["AutoCAD و نرم‌افزارهای آموزشی Autodesk", "اعتبار یک‌ساله", "گارانتی تا پایان اشتراک"] },
  { id: "coursera", name: "Coursera Business", maker: "Coursera", category: "work", monogram: "CO", etaMinutes: 5, warranty: "گارانتی تا پایان اشتراک",
    description: "دوره‌های دانشگاه‌ها و شرکت‌های معتبر با گواهی، شش ماه", use: "یاد بگیر، گواهی بگیر",
    plans: { "6": { code: 0 } }, usdt: { "6": 15.9 }, qd: { "6": { id: "P_10212", cost: 12.24 } },
    deliver: "اطلاعات ورود یک اکانت آماده Coursera Business " + QD_INSTANT,
    howTo: "با اطلاعات تحویلی وارد coursera.org شو و دوره‌ها را شروع کن.",
    includes: ["هزاران دوره با گواهی", "دوره‌های گوگل، IBM و دانشگاه‌ها", "گارانتی تا پایان اشتراک"] },
  { id: "kimi-api", family: "claude-api", tier: "Kimi", source: "کلید API از درگاه واسط", name: "Kimi API", maker: "Moonshot AI", category: "api", kind: "account", monogram: "KI", etaMinutes: 5, warranty: "کلید سالم یا بازگشت وجه",
    axis: "حجم و مدت", labels: { "1d": "۱۵ میلیون توکن، ۱ روز", "7d": "۱۰۰ میلیون توکن، ۷ روز", "30d": "۳۰۰ میلیون توکن، ۳۰ روز" },
    description: "کلید API مدل Kimi K3 از طریق درگاه واسط، برای ایجنت‌های کدنویسی", use: "Kimi در Cursor، OpenCode و Codex CLI",
    plans: { "1d": { code: 0 }, "7d": { code: 0 }, "30d": { code: 0 } }, usdt: { "1d": 3.5, "7d": 5.9, "30d": 10.9 },
    qd: { "1d": { id: "P_10350", cost: 2.12 }, "7d": { id: "P_10351", cost: 3.77 }, "30d": { id: "P_10352", cost: 7.63 } },
    deliver: "کلید API و آدرس درگاه " + QD_INSTANT,
    howTo: "کلید و Base URL تحویلی را در ابزارت وارد کن. این کلید از یک درگاه واسط است، نه حساب رسمی Moonshot.",
    includes: ["Kimi K3 برای کدنویسی و ایجنت", "سازگار با ابزارهای OpenAI-compatible", "کلید از درگاه واسط"] },
];
REAL.push(...QD_PRODUCTS);

/** Products bought from Canboso (lib/server/canboso.ts): cheaper ready accounts and links the other suppliers don't have.
 *  `cb` maps each option to the Canboso product id and its USD cost; `usdt` is our selling price (roughly +50–60% on
 *  these small amounts). Canboso keeps only a few of each item, so checkout refuses a line when its stock is gone. */
const CB_INSTANT = "بلافاصله بعد از پرداخت به‌صورت خودکار در حساب کاربری‌ات نمایش داده و پیامک می‌شود.";
const CB_PRODUCTS: Product[] = [
  { id: "figma-pro", family: "figma", tier: "Pro", name: "Figma Pro", maker: "Figma", category: "create", monogram: "FG", etaMinutes: 0, warranty: "۱ ماه گارانتی",
    description: "اکانت آماده Figma Professional دو ساله با ۳۰۰۰ اعتبار هوش مصنوعی در ماه", use: "طراحی UI با Figma Make",
    plans: { "24": { code: 0 } }, labels: { "24": "دو ساله" }, usdt: { "24": 9.9 }, cb: { "24": { id: "6a9316190c2e5f78d64ab516", cost: 6 } },
    deliver: "ایمیل و رمز اکانت Figma (رمز Hotmail همان رمز Figma است) " + CB_INSTANT,
    howTo: "با ایمیل و رمز وارد figma.com شو. ایمیل اکانت را هیچ‌وقت عوض نکن.",
    includes: ["پلن Professional دو ساله", "۳۰۰۰ اعتبار هوش مصنوعی در ماه و Figma Make", "۱ ماه گارانتی"] },
  { id: "grammarly-pro", family: "grammarly", tier: "Pro", name: "Grammarly Pro", maker: "Grammarly", category: "work", monogram: "GR", etaMinutes: 0, warranty: "گارانتی کامل یک ماه",
    description: "Grammarly Pro با هوش مصنوعی، یک ماه", use: "انگلیسی بی‌غلط و روان",
    plans: { "1": { code: 0 } }, usdt: { "1": 6.5 }, cb: { "1": { id: "6aaedda986b4242014998124", cost: 3.96 } },
    deliver: "ایمیل و رمز اکانت Grammarly Pro " + CB_INSTANT,
    howTo: "با ایمیل و رمز وارد grammarly.com شو و افزونه مرورگر یا اپ را نصب کن. چیزی در تنظیمات اکانت (رمز، ایمیل، پرداخت) را تغییر نده تا گارانتی برقرار بماند.",
    includes: ["بازنویسی جمله با یک کلیک و تنظیم لحن", "تشخیص سرقت ادبی و متن تولیدشده با هوش مصنوعی", "گارانتی کامل یک ماه"] },
  { id: "edx", name: "edX Premium", maker: "edX", category: "work", monogram: "eX", etaMinutes: 0, warranty: "گارانتی کامل یک سال",
    description: "دوره‌های هاروارد، MIT و دانشگاه‌های برتر با گواهی، یک سال", use: "از دانشگاه‌های برتر یاد بگیر",
    plans: { "12": { code: 0 } }, usdt: { "12": 4.5 }, cb: { "12": { id: "6aa7e29d1c2a8212a2fc4eb1", cost: 2.34 } },
    deliver: "ایمیل Outlook، رمز ایمیل و رمز edX یک اکانت آماده " + CB_INSTANT,
    howTo: "با ایمیل و رمز edX وارد edx.org شو و رمز را عوض کن. ایمیل اکانت را عوض نکن، وگرنه گارانتی از بین می‌رود.",
    includes: ["هزاران دوره از هاروارد، MIT و دانشگاه‌های برتر", "قابل دریافت گواهی تأییدشده", "گارانتی کامل یک سال"] },
  { id: "ilovepdf", name: "iLovePDF Premium", maker: "iLovePDF", category: "work", monogram: "PDF", etaMinutes: 0, warranty: "۱ ماه گارانتی",
    description: "ویرایش، تبدیل، فشرده‌سازی و ادغام PDF بدون محدودیت، یک سال", use: "همه کارهای PDF، یک‌جا",
    plans: { "12": { code: 0 } }, usdt: { "12": 2.5 }, cb: { "12": { id: "6a9ecbfa4f6e4dbc7703ca9e", cost: 1 } },
    deliver: "اطلاعات ورود اکانت iLovePDF Premium " + CB_INSTANT,
    howTo: "با اطلاعات تحویلی وارد ilovepdf.com شو؛ ابزارها در سایت، اپ دسکتاپ و موبایل در دسترس‌اند.",
    includes: ["تبدیل PDF به Word، Excel و PowerPoint", "ادغام، تقسیم، فشرده‌سازی و ویرایش", "۱ ماه گارانتی"] },
  { id: "apple-tv", name: "Apple TV+", maker: "Apple", category: "apple", monogram: "TV", etaMinutes: 0, warranty: "۴۸ ساعت گارانتی لینک",
    description: "سریال‌ها و فیلم‌های Apple Original، یک سال با لینک فعال‌سازی", use: "سریال و فیلم Apple",
    plans: { "12": { code: 0 } }, usdt: { "12": 5.5 }, cb: { "12": { id: "6ac0825b06baed899f5ba191", cost: 3.1 } },
    deliver: "لینک فعال‌سازی یک‌ساله " + CB_INSTANT,
    howTo: "با VPN آمریکا وارد tv.apple.com شو، با یک Apple ID (بهتر است تازه و ریجن آمریکا) وارد شو و لینک را باز کن تا اشتراک فعال شود. لینک را ظرف ۴۸ ساعت فعال کن؛ بعد از فعال‌سازی برای تماشا VPN لازم نیست.",
    includes: ["همه سریال‌ها و فیلم‌های Apple TV+", "روی آیفون، اپل‌تی‌وی، تلویزیون هوشمند و وب", "بدون نیاز به کارت بانکی"] },
  { id: "coursera-gemini", family: "coursera", tier: "Plus + Gemini", name: "Coursera Plus + Gemini", maker: "Coursera", category: "work", monogram: "CO", etaMinutes: 0, warranty: "۲۴ ساعت گارانتی",
    description: "اکانت آماده Coursera سازمانی با همه دوره‌ها و گواهی، به‌همراه Gemini سه‌ماهه", use: "دوره و گواهی رایگان، به‌علاوه Gemini",
    plans: { "3": { code: 0 } }, usdt: { "3": 5.5 }, cb: { "3": { id: "6aa67436df59fbc6fe3a61ad", cost: 3 } },
    deliver: "ایمیل، رمز و کلید 2FA یک اکانت Gmail با دسترسی سازمانی Coursera " + CB_INSTANT,
    howTo: "با ایمیل و رمز وارد شو و کد ورود را با کلید 2FA در 2fa.live بساز. بلافاصله رمز را عوض کن و 2FA خودت را بگذار؛ ایمیل اصلی را تغییر نده. Gemini سه‌ماهه را از داخل همین اکانت فعال کن. گارانتی فقط ۲۴ ساعت است؛ اکانت را همان روز بررسی کن.",
    includes: ["همه دوره‌ها و گواهی‌ها به نام خودت", "Gemini سه‌ماهه روی همین اکانت", "۲۴ ساعت گارانتی"] },
  { id: "notion-business", name: "Notion Business", maker: "Notion", category: "work", monogram: "NO", etaMinutes: 0, warranty: "بدون گارانتی",
    description: "Notion Business سه‌ماهه با Notion AI، روی اکانت خودت با لینک فعال‌سازی", use: "یادداشت، پروژه و ویکی تیم با هوش مصنوعی",
    plans: { "3": { code: 0 } }, usdt: { "3": 3.5 }, cb: { "3": { id: "6ab0cf6ff6d40479fdca8cb9", cost: 1.4 } },
    deliver: "لینک فعال‌سازی سه‌ماهه " + CB_INSTANT,
    howTo: "در مرورگر وارد اکانت Notion خودت شو و لینک را باز کن تا پلن Business روی ورک‌اسپیس فعال شود. لینک‌ها قبل از فروش تست شده‌اند ولی بعد از فعال‌سازی گارانتی ندارند.",
    includes: ["پلن Business سه‌ماهه", "Notion AI", "بدون گارانتی"] },
  { id: "lovable-lite", family: "lovable", tier: "Lite", name: "Lovable Lite", maker: "Lovable", category: "code", monogram: "LO", etaMinutes: 0, warranty: "بدون گارانتی",
    description: "Lovable یک‌ساله با ۵ اعتبار روزانه و ۳۰۰ اعتبار هدیه", use: "اپ بساز، ارزان",
    plans: { "12": { code: 0 } }, usdt: { "12": 8.9 }, cb: { "12": { id: "6a9b0f32d7c232c4391406be", cost: 5 } },
    deliver: "اطلاعات اکانت آماده Lovable Lite " + CB_INSTANT,
    howTo: "با اطلاعات تحویلی وارد lovable.dev شو و شروع کن.",
    includes: ["۵ اعتبار روزانه", "۳۰۰ اعتبار یک‌باره", "دامنه اختصاصی، بدون گارانتی"] },
  { id: "microsoft-365-personal", family: "microsoft-365", tier: "Personal", name: "Microsoft 365 Personal", maker: "Microsoft", category: "work", monogram: "MS", etaMinutes: 0, warranty: "۱ ماه گارانتی",
    description: "Word، Excel و PowerPoint با ۱۰۰ گیگ OneDrive؛ یک ماه تضمینی و تا ۱۱ ماه هدیه", use: "آفیس کامل، خیلی ارزان",
    plans: { "1": { code: 0 } }, usdt: { "1": 2.9 }, cb: { "1": { id: "6a91ab5002c1f79827573653", cost: 1 } },
    deliver: "ایمیل و رمز اکانت Microsoft 365 " + CB_INSTANT,
    howTo: "با ایمیل و رمز وارد اپ‌های آفیس شو (تا ۵ کامپیوتر). ماه اول گارانتی دارد؛ ۱۱ ماه بعد هدیه است و تضمینی نیست.",
    includes: ["Word، Excel، PowerPoint و OneNote", "۱۰۰ گیگ OneDrive", "۱ ماه گارانتی + ۱۱ ماه هدیه"] },
  // ----- API keys (relay gateways compatible with OpenAI / Anthropic clients) -----
  { id: "claude-api", source: "کلید API از درگاه واسط", tier: "Claude", name: "Claude API", maker: "Anthropic", category: "api", kind: "account", monogram: "AN", etaMinutes: 0, warranty: "گارانتی تا پایان اعتبار کلید",
    description: "کد اعتبار API برای مدل‌های Opus و Sonnet، برای Claude Code، Cursor و VS Code", use: "کدنویسی با Claude، بدون اکانت خارجی",
    axis: "حجم اعتبار", labels: { "10m": "۱۰ میلیون توکن، ۱ روز", "100m": "۱۰۰ میلیون توکن، ۳ روز", "100usd": "۱۰۰ دلار اعتبار، ۲۵ روز", "500usd": "۵۰۰ دلار اعتبار، ۳۰ روز" },
    plans: { "10m": { code: 0 }, "100m": { code: 0 }, "100usd": { code: 0 }, "500usd": { code: 0 } },
    usdt: { "10m": 3.5, "100m": 9.9, "100usd": 4.9, "500usd": 14.9 },
    cb: { "10m": { id: "6ac5c9447f2352139423ed04", cost: 1.75 }, "100m": { id: "6ae31d2de106df8ea6f0d691", cost: 6 }, "100usd": { id: "6a8e697c6d4b1ff2c2372aa2", cost: 2.56 }, "500usd": { id: "6a8d036f3d2e21a852d338cd", cost: 9.3 } },
    deliver: "کد فعال‌سازی اعتبار API " + CB_INSTANT,
    howTo: "بسته‌های توکنی: کد را در miraiapi.com/usage بخش Redeem وارد کن و از بخش Config کلید و آدرس API را برای Claude Code، Cursor یا VS Code بگیر. بسته‌های دلاری: در api.mwapi.dev ثبت‌نام کن و کد را آنجا فعال کن. اعتبار از لحظه فعال‌سازی شروع می‌شود.",
    includes: ["مدل‌های Claude Opus و Sonnet", "سازگار با Claude Code، Cursor و VS Code", "کلید از یک درگاه واسط (سازگار با OpenAI و Anthropic) است، نه از حساب رسمی سازنده"] },
  { id: "codex-api", source: "کلید API از درگاه واسط", family: "claude-api", tier: "Codex", name: "Codex API", maker: "OpenAI", category: "api", kind: "account", monogram: "CX", etaMinutes: 0, warranty: "گارانتی تا پایان اعتبار کلید",
    description: "اعتبار API مدل‌های GPT و Codex برای Codex CLI، Cursor و VS Code", use: "کدنویسی با Codex",
    axis: "حجم اعتبار", labels: { "10m": "۱۰ میلیون توکن، ۱ روز", "50m": "۵۰ میلیون توکن، ۲ روز", "100m": "۱۰۰ میلیون توکن، ۳ روز" },
    plans: { "10m": { code: 0 }, "50m": { code: 0 }, "100m": { code: 0 } }, usdt: { "10m": 3.9, "50m": 5.9, "100m": 9.9 },
    cb: { "10m": { id: "6ae9aca7ed6738dee16897f7", cost: 1.96 }, "50m": { id: "6ae8bbed5edeecad99e164a3", cost: 3.22 }, "100m": { id: "6ae8baed5edeecad99e11e5c", cost: 6.5 } },
    deliver: "کد یا کلید API به‌همراه لینک راهنمای نصب " + CB_INSTANT,
    howTo: "بسته‌های ۵۰ و ۱۰۰ میلیونی: کد را در miraiapi.com/usage بخش Redeem فعال کن و از Config کلید بگیر. بسته ۱۰ میلیونی: کد را در zendigikey.shop/check به کلید تبدیل کن و با ابزار نصب ZendiKeySetup تنظیمش کن.",
    includes: ["مدل‌های GPT و Codex", "سازگار با Codex CLI، Cursor و VS Code", "کلید از یک درگاه واسط (سازگار با OpenAI و Anthropic) است، نه از حساب رسمی سازنده"] },
  { id: "grok-api", source: "کلید API از درگاه واسط", family: "claude-api", tier: "Grok", name: "Grok API", maker: "xAI", category: "api", kind: "account", monogram: "GK", etaMinutes: 0, warranty: "گارانتی تا پایان اعتبار کلید",
    description: "اعتبار API مدل‌های Grok 4.x با آدرس سازگار با OpenAI", use: "API گراک، ارزان",
    axis: "حجم اعتبار", labels: { "10m": "۱۰ میلیون توکن، ۳ روز", "30m": "۳۰ میلیون توکن، ۱ ماه", "100m": "۱۰۰ میلیون توکن، ۱ ماه" },
    plans: { "10m": { code: 0 }, "30m": { code: 0 }, "100m": { code: 0 } }, usdt: { "10m": 3.9, "30m": 5.5, "100m": 12.9 },
    cb: { "10m": { id: "6ae8acfa5edeecad99dceb65", cost: 2.34 }, "30m": { id: "6ae8ad3e5edeecad99dd0420", cost: 3.29 }, "100m": { id: "6ae8acd65edeecad99dcdc9f", cost: 8.29 } },
    deliver: "کد اعتبار API " + CB_INSTANT,
    howTo: "کد را در redeem.teamsoclo.site به کلید تبدیل کن. آدرس API: gpt.teamsoclo.site/v1 (سازگار با OpenAI)؛ مدل‌ها grok-4.5 تا grok-4.7. راهنما: docs.teamsoclo.site",
    includes: ["مدل‌های Grok 4.5 تا 4.7", "سازگار با کتابخانه‌ها و ابزارهای OpenAI", "کلید از یک درگاه واسط (سازگار با OpenAI و Anthropic) است، نه از حساب رسمی سازنده"] },
  { id: "gemini-api", source: "کلید API از درگاه واسط", family: "claude-api", tier: "Gemini", name: "Gemini API", maker: "Google", category: "api", kind: "account", monogram: "GE", etaMinutes: 0, warranty: "گارانتی ۱ روزه کلید",
    description: "کلید API جمنای برای Claude Code، Codex CLI و ابزارهای سازگار، یک روز", use: "API جمنای برای یک روز کار سنگین",
    axis: "حجم اعتبار", labels: { "1d": "۲۰ تا ۴۰ میلیون توکن، ۱ روز" },
    plans: { "1d": { code: 0 } }, usdt: { "1d": 5.5 }, cb: { "1d": { id: "6ae8ad885edeecad99dd1d3e", cost: 3 } },
    deliver: "کلید API و لینک راهنمای نصب " + CB_INSTANT,
    howTo: "راهنمای نصب در daily.bddevlab.buzz/redeem.html است. حدود ۲۰ میلیون توکن با Gemini Argon یا ۴۰ میلیون با Gemini Flash؛ کلید یک روز بعد از صدور یا با تمام شدن توکن‌ها قطع می‌شود.",
    includes: ["Gemini Argon و Gemini Flash", "سازگار با Claude Code و Codex CLI", "کلید از یک درگاه واسط (سازگار با OpenAI و Anthropic) است، نه از حساب رسمی سازنده"] },
  { id: "deepseek-api", source: "کلید API از درگاه واسط", family: "claude-api", tier: "DeepSeek", name: "DeepSeek، Kimi و Qwen API", maker: "DeepSeek", category: "api", kind: "account", monogram: "DS", etaMinutes: 0, warranty: "گارانتی تا پایان اعتبار کلید",
    description: "یک کلید برای DeepSeek V4، Kimi K3، Qwen و GLM", use: "مدل‌های چینی، یک‌جا",
    axis: "حجم اعتبار", labels: { "50m": "۵۰ میلیون توکن، ۲ روز", "100m": "۱۰۰ میلیون توکن، ۴ روز" },
    plans: { "50m": { code: 0 }, "100m": { code: 0 } }, usdt: { "50m": 6.5, "100m": 9.9 },
    cb: { "50m": { id: "6ae3dc40ed8e0e40e4ed3647", cost: 3.79 }, "100m": { id: "6ae3dc21ed8e0e40e4ed2fda", cost: 6 } },
    deliver: "کد اعتبار API " + CB_INSTANT,
    howTo: "کد را در miraiapi.com/usage فعال کن. آدرس API: api.miraiapi.com/v1 (سازگار با OpenAI).",
    includes: ["DeepSeek V4 Pro و Flash، Kimi K3، Qwen 3.8 Max، GLM", "سازگار با ابزارهای OpenAI", "کلید از یک درگاه واسط (سازگار با OpenAI و Anthropic) است، نه از حساب رسمی سازنده"] },
  // ----- AI voice, video and photo -----
  { id: "elevenlabs-vibi", name: "ElevenLabs Credits (Vibi)", maker: "ElevenLabs", category: "api", kind: "account", monogram: "11", etaMinutes: 0, warranty: "گارانتی فعال‌سازی",
    description: "اعتبار صدای ElevenLabs و MiniMax در Vibi.pro، بدون انقضای ماهانه", use: "صداگذاری با ElevenLabs، بدون اشتراک",
    axis: "مقدار اعتبار", labels: { "131k": "۱۳۱ هزار اعتبار", "300k": "۳۰۰ هزار اعتبار" },
    plans: { "131k": { code: 0 }, "300k": { code: 0 } }, usdt: { "131k": 5.9, "300k": 9.9 },
    cb: { "131k": { id: "6ad0855f193b4b0d0f433b69", cost: 3.5 }, "300k": { id: "6adad7b0732d8b1904f4405a", cost: 6.54 } },
    deliver: "کد بازخرید اعتبار Vibi " + CB_INSTANT,
    howTo: "در vibi.pro ثبت‌نام کن و کد را در بخش بازخرید وارد کن. Vibi پلتفرم صداسازی با مدل‌های رسمی ElevenLabs و MiniMax است؛ اعتبار ماهانه منقضی نمی‌شود.",
    includes: ["مدل‌های صدای ElevenLabs و MiniMax", "بیش از ۱۰ هزار صدای چندزبانه", "اعتبار بدون انقضای ماهانه"] },
  { id: "minimax", name: "MiniMax Audio Credits", maker: "MiniMax", category: "ai", kind: "account", monogram: "MM", etaMinutes: 0, warranty: "گارانتی فعال‌سازی",
    description: "اعتبار صداسازی MiniMax در Vibi.pro، بدون انقضای ماهانه", use: "صدای طبیعی، ارزان‌تر از ElevenLabs",
    axis: "مقدار اعتبار", labels: { "131k": "۱۳۱ هزار اعتبار", "300k": "۳۰۰ هزار اعتبار" },
    plans: { "131k": { code: 0 }, "300k": { code: 0 } }, usdt: { "131k": 5.5, "300k": 9.5 },
    cb: { "131k": { id: "6aea88f9adf86f54778576f7", cost: 3.25 }, "300k": { id: "6adad7f2732d8b1904f455bd", cost: 6.16 } },
    deliver: "کد بازخرید اعتبار Vibi " + CB_INSTANT,
    howTo: "در vibi.pro ثبت‌نام کن و کد را در بخش بازخرید وارد کن. اعتبار ماهانه منقضی نمی‌شود.",
    includes: ["مدل‌های صدای MiniMax و ElevenLabs", "بیش از ۱۰ هزار صدای چندزبانه", "اعتبار بدون انقضای ماهانه"] },
  { id: "kling-account", name: "Kling AI", maker: "Kuaishou", category: "ai", monogram: "KL", etaMinutes: 0, warranty: "۱ روز گارانتی",
    description: "اکانت آماده Kling برای ساخت ویدئو با هوش مصنوعی، ۶۰۰ تا ۸۰۰ اعتبار، یک ماه", use: "ویدئو از متن و عکس",
    plans: { "1": { code: 0 } }, usdt: { "1": 8.9 }, cb: { "1": { id: "6ae32866e106df8ea6f3acab", cost: 5.5 } },
    deliver: "اطلاعات ورود اکانت Kling " + CB_INSTANT,
    howTo: "با اطلاعات تحویلی وارد klingai.com شو. گارانتی فقط ۱ روز است؛ همان روز اکانت را بررسی کن.",
    includes: ["۶۰۰ تا ۸۰۰ اعتبار", "ساخت ویدئو از متن و عکس", "۱ روز گارانتی"] },
  { id: "wink", name: "Wink VIP", maker: "Meitu", category: "create", monogram: "WK", etaMinutes: 0, warranty: "۳۰ روز گارانتی",
    description: "ویرایش ویدئو و عکس با هوش مصنوعی، فقط اندروید، یک ماه", use: "بهبود کیفیت ویدئو و حذف اشیا",
    plans: { "1": { code: 0 } }, usdt: { "1": 6.9 }, cb: { "1": { id: "6ae3dbdced8e0e40e4ed273b", cost: 4 } },
    deliver: "اطلاعات ورود اکانت Wink VIP " + CB_INSTANT,
    howTo: "فقط روی یک گوشی اندروید و حداکثر تا ۶ ساعت بعد از خرید وارد شو؛ بعد از آن گارانتی ندارد. از اکانت خارج نشو و آن را به اشتراک نگذار.",
    includes: ["افزایش کیفیت عکس و ویدئو", "حذف اشیا با هوش مصنوعی و خروجی بدون واترمارک", "فقط اندروید، ۳۰ روز گارانتی"] },
  { id: "meitu", name: "Meitu VIP+", maker: "Meitu", category: "create", monogram: "MT", etaMinutes: 0, warranty: "گارانتی کامل ۱۴ روز",
    description: "فیلترها و ابزارهای هوش مصنوعی Meitu، ۱۴ روز", use: "ویرایش عکس و سلفی",
    plans: { "14d": { code: 0 } }, labels: { "14d": "۱۴ روزه" }, usdt: { "14d": 3.9 }, cb: { "14d": { id: "6adad8d5732d8b1904f498aa", cost: 2.32 } },
    deliver: "اطلاعات ورود اکانت Meitu VIP+ " + CB_INSTANT,
    howTo: "حداکثر تا ۶ ساعت بعد از خرید و فقط روی یک دستگاه وارد شو؛ از اکانت خارج نشو و آن را به اشتراک نگذار.",
    includes: ["همه فیلترهای VIP", "حذف اشیا و ابزارهای هوش مصنوعی", "خروجی HD و 4K بدون لوگو"] },
  // ----- Cloud and dev tools -----
  { id: "google-cloud", name: "Google Cloud $300", maker: "Google", category: "code", kind: "account", monogram: "GC", etaMinutes: 0, warranty: "گارانتی تحویل",
    description: "اکانت آماده Google Cloud با ۳۰۰ دلار اعتبار، تا ۹۰ روز", use: "سرور مجازی و هاست ربات",
    plans: { "3": { code: 0 } }, usdt: { "3": 28 }, cb: { "3": { id: "6acbb61afac01298229ef3a4", cost: 20 } },
    deliver: "Gmail و رمز اکانت Google Cloud " + CB_INSTANT,
    howTo: "با Gmail و رمز وارد console.cloud.google.com شو. اعتبار ۳۰۰ دلاری حداکثر ۹۰ روز اعتبار دارد. سرویس‌های گوگل کلود از ایران با IP ایران باز نمی‌شوند.",
    includes: ["۳۰۰ دلار اعتبار Google Cloud", "VPS، Cloud Run، دیتابیس و ذخیره‌سازی", "تا ۹۰ روز"] },
  { id: "apify", name: "Apify $110", maker: "Apify", category: "code", kind: "account", monogram: "AF", etaMinutes: 0, warranty: "۱۵ روز گارانتی",
    description: "اکانت آماده Apify با ۱۱۰ دلار اعتبار برای اسکرپینگ و اتوماسیون وب", use: "اسکرپ و اتوماسیون وب",
    plans: { "1": { code: 0 } }, usdt: { "1": 5.9 }, cb: { "1": { id: "6adc472f2141666167108fd9", cost: 3 } },
    deliver: "ایمیل و رمز Outlook اکانت Apify " + CB_INSTANT,
    howTo: "با ایمیل و رمز وارد apify.com شو.",
    includes: ["۱۱۰ دلار اعتبار", "هزاران Actor آماده برای اسکرپینگ", "۱۵ تا ۲۰ روز گارانتی"] },
  { id: "autodesk-admin", family: "autocad", tier: "پنل ادمین", name: "Autodesk Education Admin", maker: "Autodesk", category: "create", kind: "account", monogram: "AD", etaMinutes: 0, warranty: "۱ ماه گارانتی",
    description: "پنل ادمین آموزشی Autodesk تا ۳۰۰۰ کاربر، سه ساله؛ برای تیم‌ها و آموزشگاه‌ها", use: "AutoCAD، Revit و Maya برای کل تیم",
    plans: { "36": { code: 0 } }, labels: { "36": "سه ساله" }, usdt: { "36": 24 }, cb: { "36": { id: "6aa9818122a97e6cc9225036", cost: 15 } },
    deliver: "ایمیل و رمز اکانت ادمین Autodesk " + CB_INSTANT,
    howTo: "با اطلاعات تحویلی وارد manage.autodesk.com شو (برای کد دومرحله‌ای، ورود Gmail را با ایمیل بازیابی تأیید کن)، رمز را عوض کن و از پنل تا ۳۰۰۰ نفر را دعوت کن.",
    includes: ["دعوت تا ۳۰۰۰ کاربر", "AutoCAD، Revit، Maya، Fusion و بقیه", "دسترسی سه ساله، ۱ ماه گارانتی"] },
];
REAL.push(...CB_PRODUCTS);

for (const p of [...REAL, ...SAMPLES]) for (const [k, v] of Object.entries(p.usdt ?? {})) p.plans[k] = planAt(p.plans[k], v, BASE_RATE);

/** Limited-price weekly drops, shown as a slider on the home page. Empty until real offers are set. */
const DROP_LIST: Drop[] = [];
/** Drops of products that are on sale right now. */
export const liveDrops = () => DROP_LIST.filter((d) => PRODUCTS.some((p) => p.id === d.productId && p.plans[d.plan]?.[d.type]));
export const currentDrop = (): Drop | undefined => liveDrops()[0];
export const dropOf = (id: string) => liveDrops().find((d) => d.productId === id);

export const kindOf = (p: Product): ProductKind => p.kind ?? "sub";
export const isSub = (p: Product) => kindOf(p) === "sub";
/** Display name of an option key: «یک ماهه», «۱۰ دلار», «آمریکا». */
export const optionLabel = (p: Product, key: string) => (livePlan(key) ? livePlanLabel(key) : p.labels?.[key] ?? duration(key));
export const axisOf = (p: Product) => p.axis ?? "مدت اشتراک";
/** «فوری» or «حدود ۱۰ دقیقه». */
export const etaText = (p: Product) => (p.etaMinutes === 0 ? "خودکار" : p.etaMinutes >= 120 ? `حدود ${fa(Math.round(p.etaMinutes / 60))} ساعت` : `حدود ${fa(p.etaMinutes)} دقیقه`);
/** Short noun for what is bought: «اشتراک», «گیفت‌کارت»… */
export const nounOf = (p: Product) => ({ sub: "اشتراک", gift: "گیفت‌کارت", account: "اکانت", qty: "استارز", number: "شماره" })[kindOf(p)];

/** Every product including hidden ones (old orders still need to show them). PRODUCTS holds only the visible ones. */
export const ALL_PRODUCTS: Product[] = [...REAL, ...SAMPLES];
export const PRODUCTS: Product[] = ALL_PRODUCTS.filter((p) => !p.hidden);
export const productById = (id: string) => ALL_PRODUCTS.find((p) => p.id === id) ?? PRODUCTS.find((p) => p.id === id)!;
export const planKeys = (p: Product) => Object.keys(p.plans) as Months[];
/** Whether an option is out of stock at its supplier right now (lib/server/sync.ts). */
export const isOut = (p: Product, plan: string, type: string) => !!p.out?.includes(`${plan}|${type}`);
/** Every option of the product is out of stock. */
export const soldOut = (p: Product) => !!p.out?.length && planKeys(p).every((m) => Object.keys(p.plans[m] ?? {}).every((t) => isOut(p, m, t)));
/** Lowest price among options in stock (among all options when everything is out). */
export const minPrice = (p: Product) => {
  const all = Object.entries(p.plans).flatMap(([m, o]) => Object.entries(o ?? {}).map(([t, v]) => ({ v: v as number, out: isOut(p, m, t) })));
  const open = all.filter((x) => !x.out);
  return Math.min(...(open.length ? open : all).map((x) => x.v));
};
export const deliveryTypes = (p: Product) =>
  [...new Set(planKeys(p).flatMap((m) => Object.keys(p.plans[m] ?? {})))] as DeliveryType[];

/** seats: group buy size (1 = just me). ip: country of the static IP add-on. */
export type Selection = {
  id: string; plan: Months; type: DeliveryType; seats?: number; ip?: string;
  /** Live virtual number (plan `5s:…`): the Toman price shown when it was picked. The server re-prices it from 5sim. */
  unit?: number;
  /** Combo pack this line was added with (lib/combos.ts); priced with the pack discount while the whole pack is in the cart. */
  combo?: string;
};
/** A cart line whose option exists: a plan of the product, or a live 5sim number. */
export const sellable = (p: Product, sel: Selection) =>
  kindOf(p) === "number" ? sel.type === "number" && !!livePlan(sel.plan) : !!p.plans[sel.plan]?.[sel.type] && !isOut(p, sel.plan, sel.type);

/** Dedicated foreign static IP, sold as an add-on to some subscriptions. Price per month of the plan. */
export const STATIC_IP = {
  title: "آی‌پی ثابت اختصاصی",
  perMonth: 390000,
  countries: { de: "آلمان", nl: "هلند", uk: "انگلیس", us: "آمریکا", fr: "فرانسه" } as Record<string, string>,
};
export const MAX_SEATS = 6;
/** Most units of a wholesale product in one cart line. */
export const MAX_QTY = 100;
/** How many units one line of this product may carry: group seats, wholesale quantity, or just one. */
export const maxUnits = (p: Product) => (p.bulk?.length ? MAX_QTY : p.group?.length ? MAX_SEATS : 1);

/** Percent off per seat for a group of `seats`, or per unit for a wholesale quantity. */
export function groupOff(p: Product, seats: number) {
  let off = 0;
  for (const [n, pct] of p.bulk ?? p.group ?? []) if (seats >= n) off = pct;
  return off;
}
export const ipPrice = (p: Product, plan: Months) => (p.ip && isSub(p) ? STATIC_IP.perMonth * Math.max(1, Number(plan) || 1) : 0);

/** Full price of one cart line: seats with group discount, plus add-ons. */
export function linePrice(sel: Selection) {
  const p = productById(sel.id);
  const seats = Math.min(maxUnits(p), Math.max(1, Math.trunc(sel.seats ?? 1)));
  const unit = priceOf(sel).price;
  const group = Math.round((unit * seats * (100 - groupOff(p, seats))) / 100 / 1000) * 1000;
  const ip = sel.ip && STATIC_IP.countries[sel.ip] ? ipPrice(p, sel.plan) : 0;
  return group + ip;
}

/** «۳ نفر • آی‌پی ثابت آلمان», or "" for a plain line. */
export function extrasLabel(sel: Selection) {
  const out: string[] = [];
  if ((sel.seats ?? 1) > 1) out.push(productById(sel.id)?.bulk?.length ? `${fa(sel.seats!)} عدد` : `خرید گروهی ${fa(sel.seats!)} نفره`);
  if (sel.ip && STATIC_IP.countries[sel.ip]) out.push(`${STATIC_IP.title} ${STATIC_IP.countries[sel.ip]}`);
  return out.join(" • ");
}

export function priceOf(sel: Selection): { price: number; was?: number } {
  if (livePlan(sel.plan)) return { price: Math.max(0, Math.round(Number(sel.unit) || 0)) };
  const base = productById(sel.id).plans[sel.plan]?.[sel.type] ?? 0;
  const d = liveDrops().find((x) => x.productId === sel.id && x.plan === sel.plan && x.type === sel.type);
  if (d) return { price: d.price, was: base };
  return { price: base };
}

/** Title and one-line detail of a delivery method, as this product names it. */
export const deliveryOf = (p: Product | undefined, t: DeliveryType) => ({ ...DELIVERY[t], ...p?.types?.[t] });

/** What each delivery method means, in plain words, for this product. */
export function deliveryExplain(p: Product, t: DeliveryType) {
  const own = p.types?.[t]?.explain;
  if (own) return own;
  if (t !== "code" && p.deliver && deliveryTypes(p).length === 1) return p.deliver;
  switch (t) {
    case "own": return p.ask ? `${p.ask.short} اکانت ${p.maker} خودت را می‌دهی و اشتراک روی همان فعال می‌شود. رمز نمی‌خواهیم و تاریخچه‌ات می‌ماند.` : `ایمیل اکانت ${p.maker} خودت را می‌دهی و اشتراک روی همان فعال می‌شود. رمز نمی‌خواهیم و تاریخچه‌ات می‌ماند.`;
    case "shared": return "اطلاعات ورود یک اکانت آماده تحویل می‌گیری که با چند نفر دیگر مشترک است. ارزان‌ترین راه است؛ رمز را عوض نکن و تاریخچه‌ات برای بقیه هم دیده می‌شود.";
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
/** A variant's cheapest starting option: its key, price, and the price per month for subscriptions (so a 3-month Go compares fairly with a 1-month Plus). */
export const entryOf = (p: Product) => {
  const all = planKeys(p).flatMap((m) => Object.values(p.plans[m] ?? {}).map((v) => ({ plan: m, price: v as number })));
  const min = Math.min(...all.map((x) => x.price));
  const plan = all.find((x) => x.price === min)?.plan ?? planKeys(p)[0];
  const months = isSub(p) && Number(plan) > 0 ? Number(plan) : 1;
  const monthly = isSub(p) ? Math.min(...all.map((x) => x.price / (Number(x.plan) || 1))) : min;
  return { plan, price: minPrice(p), months, monthly };
};
/** All variants of a product's family, from the entry tier up (cheapest per month first; just the product when it has none). */
export const variantsOf = (p: Product) => {
  const fam = brandOf(p);
  return PRODUCTS.filter((x) => brandOf(x) === fam).sort((a, b) => entryOf(a).monthly - entryOf(b).monthly || minPrice(a) - minPrice(b));
};
/** Products shown in listings: one card per family. */
export const listed = () => PRODUCTS.filter((p) => !p.family || !PRODUCTS.some((x) => x.id === p.family));
/** «Go · Plus · Pro» for a family card, or "". */
export const tiersLabel = (p: Product) => {
  const v = variantsOf(p);
  return v.length > 1 ? v.map((x) => x.tier ?? splitTier(x.name)).join(" · ") : "";
};
const splitTier = (name: string) => name.split(" ").slice(-1)[0];
