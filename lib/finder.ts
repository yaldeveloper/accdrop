// «ابزاریاب»: the customer says what they want to do, we recommend tools from our own catalog.
import { PRODUCTS, minPrice, type Product } from "./catalog";
import { norm, searchProducts } from "./search";
import { CONTENT } from "./content";

export type Pick = { id: string; why: string };
export type Task = {
  id: string;
  label: string;
  /** One line under the label: what this covers. */
  line: string;
  /** Accent colour of the card. */
  tone: string;
  /** A 24×24 stroke icon. */
  glyph: string;
  /** Words people type for this task, Persian and English. */
  words: string[];
  /** In order of recommendation: the first is «بهترین انتخاب». */
  picks: Pick[];
};

export const TASKS: Task[] = [
  {
    id: "code", label: "برنامه‌نویسی", line: "کد نوشتن، دیباگ و ایجنت کدنویسی", tone: "#7C8CFF",
    glyph: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-4 14",
    words: ["کد", "کدنویسی", "برنامه نویسی", "برنامه‌نویس", "پایتون", "جاوا", "دیباگ", "باگ", "ریکت", "بک اند", "فرانت", "code", "coding", "programming", "python", "developer", "ide"],
    picks: [
      { id: "grok-cursor", why: "ادیتور کد با هوش مصنوعی؛ کل پروژه را می‌فهمد و خودش کد را تغییر می‌دهد. SuperGrok هم کنارش هدیه است." },
      { id: "claude", why: "دقیق‌ترین مدل برای کد تمیز و توضیح خط‌به‌خط. اگر زیاد کد می‌زنی Max را ببین." },
      { id: "warp", why: "ترمینال هوشمند؛ دستور را فارسی بگو، خودش اجرا می‌کند." },
      { id: "claude-api", why: "کلید API برای Claude Code، Cline یا ایجنت خودت. فقط به اندازه مصرف بپرداز." },
    ],
  },
  {
    id: "app", label: "ساخت اپ و سایت بدون کد", line: "ایده‌ات را بگو، اپ تحویل بگیر", tone: "#FF6B8B",
    glyph: "M4 5h16v11H4zM8 20h8M12 16v4",
    words: ["سایت", "وبسایت", "اپ", "اپلیکیشن", "استارتاپ", "فروشگاه اینترنتی", "لندینگ", "بدون کد", "nocode", "app", "website", "landing", "mvp", "vibe"],
    picks: [
      { id: "lovable", why: "فقط توضیح بده چه می‌خواهی؛ اپ و سایت کامل با دیتابیس می‌سازد و منتشر می‌کند." },
      { id: "framer", why: "برای سایت شرکتی و پورتفولیو که باید خیلی شیک باشد. بدون کد، با دامنه خودت." },
      { id: "gamma", why: "یک صفحه معرفی یا لندینگ ساده در چند دقیقه، با هوش مصنوعی." },
    ],
  },
  {
    id: "write", label: "نوشتن و ترجمه", line: "مقاله، کپشن، ایمیل و ترجمه", tone: "#10A37F",
    glyph: "M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4",
    words: ["نوشتن", "متن", "مقاله", "کپشن", "ترجمه", "ایمیل", "محتوا", "تولید محتوا", "سئو", "انشا", "write", "writing", "translate", "content", "copywriting"],
    picks: [
      { id: "chatgpt", why: "همه‌کاره‌ترین دستیار؛ از کپشن اینستاگرام تا ترجمه رسمی، فارسی را هم خوب می‌فهمد." },
      { id: "claude", why: "متن‌هایش طبیعی‌تر و کمتر «رباتی» است؛ برای مقاله بلند و لحن حرفه‌ای عالی است." },
      { id: "grammarly", why: "متن انگلیسی‌ات را بی‌غلط و روان می‌کند، داخل Gmail و Word." },
    ],
  },
  {
    id: "image", label: "ساخت عکس و طراحی", line: "عکس با هوش مصنوعی، پوستر و پست", tone: "#F2B860",
    glyph: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5h.01",
    words: ["عکس", "تصویر", "پوستر", "لوگو", "طراحی", "پست اینستاگرام", "بنر", "فتوشاپ", "ادیت عکس", "image", "photo", "design", "poster", "logo", "midjourney", "dalle"],
    picks: [
      { id: "chatgpt", why: "ساخت عکس با یک جمله فارسی و ویرایشش با گفت‌وگو. نوشته داخل عکس را هم درست می‌نویسد." },
      { id: "adobe-express", why: "قالب آماده برای پست، استوری و پوستر، به‌همراه Firefly برای ساخت عکس." },
      { id: "google-ai-pro", why: "Gemini با Nano Banana برای ویرایش عکس دقیق، به‌همراه ۲ ترابایت فضا." },
      { id: "meitu", why: "روتوش و افکت عکس پرتره روی موبایل، با یک لمس." },
    ],
  },
  {
    id: "video", label: "ساخت ویدیو با هوش مصنوعی", line: "از متن یا عکس، ویدیو بساز", tone: "#FF8A3D",
    glyph: "M3 6h13v12H3zM16 10l5-3v10l-5-3",
    words: ["ویدیو", "ویدئو", "فیلم", "انیمیشن", "تیزر", "تبلیغ", "veo", "kling", "sora", "video", "animation", "reels"],
    picks: [
      { id: "kling-account", why: "از متن یا یک عکس، ویدیوی واقع‌گرایانه می‌سازد. محبوب‌ترین بین تولیدکننده‌های محتوا." },
      { id: "google-ai-ultra-basic", why: "ارزان‌ترین راه به Veo گوگل؛ ویدیو با صدا و دیالوگ." },
      { id: "capcut", why: "ویدیوهای ساخته‌شده را تدوین کن، زیرنویس خودکار بزن و منتشر کن." },
    ],
  },
  {
    id: "edit", label: "تدوین و ریلز", line: "تدوین، زیرنویس و محتوای اینستاگرام", tone: "#2AABEE",
    glyph: "M6 4v16M18 4v16M6 9h12M6 15h12",
    words: ["تدوین", "ادیت ویدیو", "ریلز", "استوری", "یوتیوب", "تیک تاک", "زیرنویس", "اینستاگرام", "پیج", "ادمین پیج", "edit", "reels", "youtube", "tiktok", "instagram", "subtitle"],
    picks: [
      { id: "capcut", why: "حرفه‌ای‌ترین تدوین روی موبایل و کامپیوتر، با زیرنویس و حذف پس‌زمینه خودکار." },
      { id: "adobe-express", why: "کاور، استوری و ویدیو کوتاه با قالب‌های آماده Adobe." },
      { id: "wink", why: "بهبود کیفیت ویدیو و حذف اشیا روی گوشی اندروید." },
    ],
  },
  {
    id: "voice", label: "صداگذاری و پادکست", line: "متن به صدا، دوبله و گویندگی", tone: "#B9FF63",
    glyph: "M12 3v12M8 7v6M16 7v6M4 10v2M20 10v2M9 21h6",
    words: ["صدا", "صداگذاری", "دوبله", "گوینده", "پادکست", "کتاب صوتی", "voice", "tts", "dubbing", "podcast"],
    picks: [
      { id: "elevenlabs", why: "طبیعی‌ترین صدای هوش مصنوعی، به هر زبان؛ برای ویدیو، پادکست و دوبله." },
      { id: "minimax", why: "صدای طبیعی، ارزان‌تر از ElevenLabs؛ اعتبارش ماهانه نمی‌سوزد." },
      { id: "elevenlabs-vibi", why: "اعتبار ElevenLabs برای کار سنگین، به‌صرفه‌تر از اشتراک." },
    ],
  },
  {
    id: "study", label: "درس و دانشگاه", line: "حل تمرین، خلاصه و آمادگی آزمون", tone: "#8B6CFF",
    glyph: "M3 8l9-4 9 4-9 4-9-4ZM7 10v5c3 2 7 2 10 0v-5",
    words: ["درس", "دانشگاه", "دانشجو", "تمرین", "امتحان", "کنکور", "آزمون", "خلاصه", "جزوه", "مدرسه", "study", "student", "exam", "homework", "university"],
    picks: [
      { id: "google-ai-pro", why: "Gemini با NotebookLM؛ جزوه و PDF را بده، خلاصه و سؤال امتحانی بگیر. شش ماهه و ارزان." },
      { id: "chatgpt", why: "حل قدم‌به‌قدم تمرین ریاضی و فیزیک، با عکس از سؤال." },
      { id: "quizlet", why: "فلش‌کارت و آزمون هوشمند برای حفظ لغت و درس." },
      { id: "coursera", why: "دوره دانشگاه‌های معتبر با گواهی برای رزومه." },
    ],
  },
  {
    id: "research", label: "تحقیق و پایان‌نامه", line: "مقاله‌خوانی، منبع و گزارش کامل", tone: "#D97757",
    glyph: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4M8 11h6",
    words: ["تحقیق", "پژوهش", "پایان نامه", "پایان‌نامه", "مقاله علمی", "منبع", "گزارش", "رفرنس", "تز", "research", "thesis", "paper", "report"],
    picks: [
      { id: "manus", why: "ایجنتی که خودش جست‌وجو می‌کند، می‌خواند و گزارش کامل با منبع تحویل می‌دهد." },
      { id: "google-ai-pro", why: "Deep Research جمینای و NotebookLM برای خواندن ده‌ها مقاله با هم." },
      { id: "claude", why: "متن‌های خیلی بلند و PDF را دقیق می‌خواند و تحلیل می‌کند." },
      { id: "ilovepdf", why: "تبدیل، فشرده‌سازی و ادغام PDF، بدون محدودیت." },
    ],
  },
  {
    id: "slides", label: "ارائه و پاورپوینت", line: "اسلاید حرفه‌ای در چند دقیقه", tone: "#E5484D",
    glyph: "M4 4h16v11H4zM12 15v5M8 20h8M8 11V9M12 11V7M16 11v-1",
    words: ["ارائه", "اسلاید", "پاورپوینت", "پرزنت", "سمینار", "پروپوزال", "powerpoint", "slides", "presentation", "pitch"],
    picks: [
      { id: "gamma", why: "موضوع را بگو، ارائه کامل با طراحی و عکس تحویل بگیر. خروجی پاورپوینت هم می‌دهد." },
      { id: "microsoft-365", why: "PowerPoint و Word و Excel کامل با Copilot، یک سال." },
      { id: "chatgpt", why: "متن و ساختار ارائه را بنویس، بعد در هر ابزاری بچین." },
    ],
  },
  {
    id: "ui", label: "طراحی UI و محصول", line: "رابط کاربری، پروتوتایپ و نقشه", tone: "#A259FF",
    glyph: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7",
    words: ["ui", "ux", "رابط کاربری", "فیگما", "پروتوتایپ", "طراح محصول", "اتوکد", "نقشه", "معماری", "figma", "prototype", "autocad", "cad"],
    picks: [
      { id: "figma", why: "استاندارد طراحی UI؛ کار تیمی و پروتوتایپ، یک سال." },
      { id: "framer", why: "طرحت را مستقیم به سایت زنده تبدیل کن." },
      { id: "autocad", why: "برای دانشجوی مهندسی و معماری: AutoCAD آموزشی یک‌ساله." },
    ],
  },
  {
    id: "english", label: "یادگیری زبان", line: "انگلیسی و هر زبان دیگر", tone: "#58CC02",
    glyph: "M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 4-3 7-6 8M13 21l4-9 4 9M14.5 18h5",
    words: ["زبان", "انگلیسی", "آیلتس", "تافل", "مکالمه", "لغت", "گرامر", "آلمانی", "english", "ielts", "toefl", "language", "duolingo"],
    picks: [
      { id: "duolingo", why: "روزی ده دقیقه، بدون تبلیغ و محدودیت قلب." },
      { id: "chatgpt", why: "با حالت صوتی مکالمه تمرین کن؛ مثل یک معلم خصوصی صبور." },
      { id: "grammarly", why: "برای رایتینگ آیلتس و ایمیل‌های کاری بی‌غلط." },
    ],
  },
  {
    id: "work", label: "کسب‌وکار و تیم", line: "کار تیمی، جلسه و اتوماسیون", tone: "#F2B860",
    glyph: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
    words: ["کسب و کار", "بیزنس", "شرکت", "تیم", "جلسه", "مدیریت پروژه", "اتوماسیون", "ایجنت", "اکسل", "business", "team", "meeting", "automation", "agent", "excel"],
    picks: [
      { id: "chatgpt-business", why: "ChatGPT برای تیم، با فضای کاری مشترک و داده‌هایی که برای آموزش استفاده نمی‌شود." },
      { id: "manus", why: "کارهای تکراری را به ایجنت بسپار: تحقیق بازار، جدول، گزارش." },
      { id: "notion-business", why: "یادداشت، پروژه و دانش تیم یک‌جا، با Notion AI." },
      { id: "zoom", why: "جلسه و کلاس آنلاین بدون محدودیت ۴۰ دقیقه." },
    ],
  },
  {
    id: "job", label: "کاریابی و رزومه", line: "رزومه، لینکدین و مصاحبه", tone: "#0A66C2",
    glyph: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
    words: ["کاریابی", "رزومه", "مصاحبه", "لینکدین", "مهاجرت", "اپلای", "استخدام", "job", "resume", "cv", "linkedin", "interview", "apply"],
    picks: [
      { id: "linkedin", why: "پیام مستقیم به استخدام‌کننده‌ها و دیده‌شدن بیشتر در جست‌وجو." },
      { id: "chatgpt", why: "رزومه و کاورلتر را برای هر آگهی بازنویسی کن و مصاحبه تمرین کن." },
      { id: "grammarly", why: "ایمیل و رزومه انگلیسی بدون حتی یک غلط." },
    ],
  },
];

/** On sale and has a page: a pick that was hidden or removed by the admin is skipped. */
const exists = (id: string) => (CONTENT[id] ? PRODUCTS.find((p) => p.id === id) : undefined);

/** The picks of a task that are on sale right now. */
export function picksOf(t: Task): { p: Product; why: string }[] {
  return t.picks.map((k) => ({ p: exists(k.id)!, why: k.why })).filter((x) => x.p);
}

/** Tasks with at least two products on sale: a single option is not a recommendation. */
export const liveTasks = () => TASKS.filter((t) => picksOf(t).length >= 2);

/** The cheapest pick that is not the first one, for the «اقتصادی» tag. */
export function budgetPick(list: { p: Product }[]) {
  if (list.length < 2) return undefined;
  const top = minPrice(list[0].p);
  const rest = list.slice(1).filter((x) => minPrice(x.p) < top);
  return rest.sort((a, b) => minPrice(a.p) - minPrice(b.p))[0]?.p.id;
}

/** What the customer typed → the best matching tasks, then any products that match by name. */
export function matchTasks(text: string) {
  const q = norm(text);
  if (!q) return { tasks: [] as Task[], products: [] as Product[] };
  const scored = liveTasks().map((t) => {
    let s = 0;
    if (norm(t.label).includes(q) || q.includes(norm(t.label))) s += 5;
    for (const w of t.words) {
      const n = norm(w);
      if (n.length <= 2) { if (q === n) s += 3; continue; }
      if (q.includes(n)) s += n.length >= 4 ? 3 : 2;
      else if (n.startsWith(q) && q.length >= 2) s += 1;
    }
    return { t, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const products = scored.length ? [] : searchProducts(text).slice(0, 6);
  return { tasks: scored.map((x) => x.t), products };
}
