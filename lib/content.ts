// Long-form, per-product copy for the product pages (SEO). Sample text; edit freely.
import type { Product } from "./catalog";

export type ProductContent = {
  /** URL slug, e.g. /chatgpt-plus */
  slug: string;
  /** Persian search name, used in titles: «خرید اشتراک ChatGPT Plus» */
  faName: string;
  intro: string;
  forWho: string[];
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
};

export const contentOf = (p: Product) => CONTENT[p.id];
export const productHref = (p: Product) => `/${CONTENT[p.id].slug}`;
