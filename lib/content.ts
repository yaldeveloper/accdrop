// Long-form, per-product copy for the product pages (SEO). Sample text; edit freely.
import type { Product } from "./catalog";

export type ProductContent = {
  /** URL slug, e.g. /chatgpt-plus */
  slug: string;
  /** Persian search name, used in titles: «خرید اکانت ChatGPT Plus» */
  faName: string;
  intro: string;
  forWho: string[];
  /** Small line above the h1; defaults to «خرید اکانت». */
  prefix?: string;
  /** Main search phrase for the title; defaults to «خرید اکانت {name}». */
  keyword?: string;
};

export const CONTENT: Record<string, ProductContent> = {
  chatgpt: { slug: "chatgpt-plus", faName: "چت جی پی تی پلاس",
    intro: "ChatGPT Plus نسخه کامل دستیار هوشمند OpenAI است: جدیدترین مدل‌ها، تولید تصویر، حالت صوتی و Deep Research، با سقف استفاده بسیار بالاتر از نسخه رایگان.",
    forWho: ["نویسنده‌ها و تولیدکننده‌های محتوا", "دانشجوها و پژوهشگرها", "مدیرها و کارآفرین‌ها"] },
  claude: { slug: "claude-pro", faName: "کلاد پرو",
    intro: "Claude Pro نسخه حرفه‌ای دستیار Anthropic است؛ برای نوشتن دقیق، تحلیل اسناد طولانی و کدنویسی، همراه Projects و Claude Code.",
    forWho: ["برنامه‌نویس‌ها", "نویسنده‌ها و مترجم‌ها", "تحلیلگرها و پژوهشگرها"] },
  gemini: { slug: "google-ai-pro", faName: "جمنای (Google AI Pro)",
    intro: "Google AI Pro دسترسی کامل به Gemini، به‌همراه ۲ ترابایت فضای Google One و هوش مصنوعی داخل Gmail، Docs و Sheets است.",
    forWho: ["کاربرهای سرویس‌های گوگل", "تیم‌ها و دانشجوها", "هر کسی که فضای ابری بیشتری لازم دارد"] },
  perplexity: { slug: "perplexity-pro", faName: "پرپلکسیتی پرو",
    intro: "Perplexity Pro موتور پاسخ هوشمند است: سؤال بپرس، جواب دقیق با منبع بگیر. با انتخاب بین مدل‌های برتر و تحلیل فایل.",
    forWho: ["پژوهشگرها و دانشجوها", "روزنامه‌نگارها", "هر کسی که جواب با منبع می‌خواهد"] },
  grok: { slug: "supergrok", faName: "سوپر گراک",
    intro: "SuperGrok دسترسی به پیشرفته‌ترین مدل‌های xAI با سقف استفاده بالاتر و تولید تصویر است.",
    forWho: ["کاربرهای حرفه‌ای هوش مصنوعی", "تولیدکننده‌های محتوا"] },
  cursor: { slug: "cursor-pro", faName: "کرسر پرو",
    intro: "Cursor Pro ادیتور کدی است که هوش مصنوعی در قلبش قرار دارد: تکمیل کد نامحدود، Agent برای انجام کار در کل پروژه و درخواست‌های سریع ماهانه.",
    forWho: ["توسعه‌دهنده‌ها", "تیم‌های نرم‌افزاری", "دانشجوهای برنامه‌نویسی"] },
  copilot: { slug: "github-copilot", faName: "گیت‌هاب کوپایلوت",
    intro: "GitHub Copilot دستیار کدنویسی داخل VS Code و JetBrains است؛ تکمیل خودکار کد و گفتگو درباره پروژه، کنار ادیتوری که به آن عادت داری.",
    forWho: ["توسعه‌دهنده‌ها", "تیم‌های نرم‌افزاری"] },
  adobe: { slug: "adobe-creative-cloud", faName: "ادوبی کریتیو کلاد",
    intro: "Creative Cloud همه اپ‌های Adobe را یک‌جا می‌دهد: Photoshop، Illustrator، Premiere و بیشتر، همراه اعتبار Firefly برای تولید با هوش مصنوعی.",
    forWho: ["طراح‌ها و عکاس‌ها", "تدوینگرها", "آژانس‌ها و استودیوها"] },
  canva: { slug: "canva-pro", faName: "کانوا پرو",
    intro: "Canva Pro همه قالب‌ها و المان‌های حرفه‌ای Canva را باز می‌کند؛ همراه Magic Studio و Brand Kit برای طراحی سریع و یکدست.",
    forWho: ["ادمین‌های شبکه‌های اجتماعی", "کسب‌وکارهای کوچک", "معلم‌ها و دانشجوها"] },
  capcut: { slug: "capcut-pro", faName: "کپ کات پرو",
    intro: "CapCut Pro تدوین ویدئو را حرفه‌ای و سریع می‌کند: همه افکت‌ها، خروجی بدون واترمارک و ابزارهای هوش مصنوعی.",
    forWho: ["تولیدکننده‌های محتوای کوتاه", "ادمین‌های اینستاگرام", "تدوینگرها"] },
  kling: { slug: "kling-ai", faName: "کلینگ",
    intro: "Kling AI از متن و تصویر، ویدئوی واقعی‌نما می‌سازد. اعتبار ماهانه، کیفیت حرفه‌ای و بدون واترمارک.",
    forWho: ["تولیدکننده‌های محتوا", "تبلیغات و مارکتینگ", "فیلم‌سازها"] },
  notion: { slug: "notion-plus", faName: "نوشن",
    intro: "Notion Plus فضای نوشتن، برنامه‌ریزی و دانش تیم توست، همراه Notion AI برای خلاصه‌کردن، نوشتن و جست‌وجو.",
    forWho: ["تیم‌ها و استارتاپ‌ها", "مدیر پروژه‌ها", "دانشجوها"] },
  tgpremium: { slug: "telegram-premium", faName: "تلگرام پرمیوم", prefix: "خرید", keyword: "خرید تلگرام پرمیوم",
    intro: "Telegram Premium را فقط با یوزرنیم، روی آیدی خودت فعال کن: آپلود ۴ گیگابایتی، دانلود سریع‌تر، تبدیل ویس به متن و بدون تبلیغ.",
    forWho: ["کاربرهای حرفه‌ای تلگرام", "ادمین کانال‌ها و گروه‌ها", "کسب‌وکارهای تلگرامی"] },
  tgstars: { slug: "telegram-stars", faName: "استارز تلگرام", prefix: "خرید", keyword: "خرید استارز تلگرام",
    intro: "استارز ارز داخلی تلگرام است؛ برای خرید در ربات‌ها و مینی‌اپ‌ها، حمایت از کانال‌ها و هدیه دادن. فقط یوزرنیم را بده، روی آیدی‌ات می‌نشیند.",
    forWho: ["کاربرهای مینی‌اپ‌ها و بازی‌ها", "حامیان کانال‌ها", "هر کسی که می‌خواهد هدیه بدهد"] },
  appleid: { slug: "apple-id", faName: "اپل آیدی", prefix: "خرید", keyword: "خرید اپل آیدی آماده",
    intro: "اپل آیدی آماده و اختصاصی آمریکا، ترکیه یا انگلیس؛ با ایمیل تازه و اطلاعات امنیتی کامل، فقط برای تو. برای App Store و iCloud همان کشور.",
    forWho: ["کاربرهای آیفون و آیپد", "کسانی که اپ‌های خارجی لازم دارند", "خریداران گیفت‌کارت"] },
  applegift: { slug: "apple-gift-card", faName: "گیفت کارت اپل", prefix: "خرید", keyword: "خرید گیفت کارت اپل (آیتونز)",
    intro: "گیفت‌کارت اپل آمریکا (همان آیتونز سابق) با تحویل فوری: کد را بلافاصله بعد از پرداخت می‌گیری و اپل آیدی‌ات را شارژ می‌کنی.",
    forWho: ["خرید اپ و بازی", "تمدید اشتراک‌های اپل", "هدیه دادن"] },
  linkedin: { slug: "linkedin-premium", faName: "لینکدین پرمیوم",
    intro: "LinkedIn Premium روی اکانت خودت: پیام مستقیم به استخدام‌کننده‌ها، دیدن بازدیدکننده‌های پروفایل و دسترسی به LinkedIn Learning.",
    forWho: ["کارجوها و مهاجرت کاری", "فریلنسرها", "فروش و توسعه بازار"] },
  duolingo: { slug: "super-duolingo", faName: "سوپر دولینگو", prefix: "خرید", keyword: "خرید سوپر دولینگو",
    intro: "Super Duolingo روی اکانت خودت: بدون تبلیغ، قلب نامحدود و تمرین شخصی‌سازی‌شده، تا هر روز بدون وقفه زبان یاد بگیری.",
    forWho: ["زبان‌آموزها", "آماده‌شدن برای مهاجرت", "دانش‌آموزها و دانشجوها"] },
  vnumber: { slug: "virtual-number", faName: "شماره مجازی", prefix: "خرید", keyword: "خرید شماره مجازی تلگرام و واتس‌اپ",
    intro: "شماره مجازی آمریکا، انگلیس، کانادا یا هلند برای ثبت‌نام در تلگرام و واتس‌اپ؛ تحویل فوری و کد تأیید در حساب کاربری. اگر کد نیامد، پولت برمی‌گردد.",
    forWho: ["ساخت اکانت دوم تلگرام", "کسب‌وکارها", "ثبت‌نام در سرویس‌های خارجی"] },
};

export const contentOf = (p: Product) => CONTENT[p.id];
export const productHref = (p: Product) => `/${CONTENT[p.id].slug}`;
