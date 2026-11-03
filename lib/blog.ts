// Blog posts. Admins write posts in the panel (stored in the `posts` table); these built-in posts are the starting set
// and can be overridden from the panel by saving a post with the same slug.
export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  /** Simple markdown: "## heading", "### sub", "- list", "1. list", "> note", **bold**, [text](url). */
  body: string;
  tags: string[];
  /** Product ids to promote under the post. */
  products: string[];
  /** Accent colour for the cover. */
  cover: string;
  published: boolean;
  createdAt: number;
  updatedAt: number;
};

const d = (iso: string) => new Date(iso).getTime();

export const SEED_POSTS: Post[] = [
  {
    slug: "chatgpt-go-plus-pro", title: "ChatGPT Go، Plus یا Pro؛ کدام را بخرم؟",
    excerpt: "سه نسخه پولی ChatGPT را ساده مقایسه کرده‌ایم تا بدانی پولت را کجا خرج کنی.",
    tags: ["هوش مصنوعی", "راهنمای خرید"], products: ["chatgpt-go", "chatgpt", "chatgpt-pro"], cover: "#10A37F", published: true,
    createdAt: d("2026-10-20"), updatedAt: d("2026-10-28"),
    body: `ChatGPT حالا سه نسخه پولی دارد و انتخاب بینشان برای خیلی‌ها گیج‌کننده است. خلاصه‌اش این است: **Go برای استفاده سبک، Plus برای بیشتر آدم‌ها، Pro برای کار سنگین و حرفه‌ای.**

## ChatGPT Go: ارزان و کافی برای شروع
اگر هر روز چند سؤال می‌پرسی، متن کوتاه می‌نویسی یا ترجمه می‌کنی، Go کافی است. سقف پیام و ساخت تصویرش خیلی بیشتر از نسخه رایگان است و قیمتش کمتر از نصف Plus.
- مناسب دانشجوها و استفاده روزمره
- بدون Deep Research کامل و Agent

## ChatGPT Plus: انتخاب بیشتر آدم‌ها
Plus همه امکانات اصلی را دارد: جدیدترین مدل‌ها، ساخت تصویر، حالت صوتی، Deep Research و Agent با سقف معقول. اگر شک داری، Plus را بخر.

## ChatGPT Pro: وقتی سقف برایت مهم است
Pro برای کسی است که روزی چند ساعت با ChatGPT کار می‌کند: پژوهشگر، برنامه‌نویس یا تحلیلگر. استفاده تقریباً نامحدود و حالت Pro برای سخت‌ترین سؤال‌ها.

> نکته: اگر با دوستانت می‌خرید، **خرید گروهی** Plus را تا ۱۲٪ ارزان‌تر می‌کند و هر نفر اشتراک جدا روی ایمیل خودش می‌گیرد.

## خلاصه
1. استفاده سبک و بودجه کم: Go
2. استفاده جدی و روزانه: Plus
3. کار حرفه‌ای بدون سقف: Pro`,
  },
  {
    slug: "group-buy-guide", title: "خرید گروهی اشتراک؛ هر نفر ارزان‌تر، هر نفر اکانت خودش",
    excerpt: "خرید گروهی در اک‌دراپ یعنی چه، چقدر ارزان‌تر است و چه فرقی با اکانت اشتراکی دارد.",
    tags: ["راهنمای خرید"], products: ["chatgpt", "claude", "canva"], cover: "#B9FF63", published: true,
    createdAt: d("2026-10-25"), updatedAt: d("2026-10-25"),
    body: `خیلی‌ها برای ارزان‌تر شدن، یک اکانت را بین چند نفر تقسیم می‌کنند. مشکلش واضح است: تاریخچه مشترک، خروج ناگهانی و ریسک بسته شدن اکانت. **خرید گروهی** اک‌دراپ این مشکل را ندارد.

## چطور کار می‌کند؟
- در صفحه سرویس، گزینه «خرید گروهی» را بزن و تعداد نفرات را انتخاب کن.
- در مرحله پرداخت ایمیل هر نفر را وارد کن.
- یک بار پرداخت می‌کنی و هر نفر اشتراک جدا روی اکانت خودش می‌گیرد.

## چقدر ارزان‌تر؟
از ۲ نفر ۵٪، از ۳ نفر ۸٪ و از ۵ نفر ۱۲٪ تخفیف برای هر نفر. برای یک تیم ۵ نفره، این یعنی تقریباً یک اشتراک مجانی در سال.

## کدام سرویس‌ها؟
ChatGPT، Claude، Gemini، Cursor، Canva و Notion. فهرست کامل را در [صفحه خرید گروهی](/group) ببین.`,
  },
  {
    slug: "cursor-vs-copilot", title: "Cursor یا GitHub Copilot؛ برای برنامه‌نویس‌ها کدام بهتر است؟",
    excerpt: "دو دستیار کدنویسی محبوب را از نظر قیمت، قدرت و راحتی مقایسه کرده‌ایم.",
    tags: ["برنامه‌نویسی", "مقایسه"], products: ["cursor", "copilot", "claude"], cover: "#7C8CFF", published: true,
    createdAt: d("2026-10-30"), updatedAt: d("2026-10-30"),
    body: `اگر برنامه‌نویسی، احتمالاً بین Cursor و GitHub Copilot مردد هستی. هر دو عالی‌اند، ولی برای دو سبک کار متفاوت.

## Cursor: ادیتوری که از اول با هوش مصنوعی ساخته شده
Cursor یک ادیتور کامل (بر پایه VS Code) است. قدرتش در **Agent** است: یک تغییر را در چند فایل با هم انجام می‌دهد، تست می‌نویسد و خطا را خودش دنبال می‌کند.

## Copilot: دستیار داخل ادیتوری که الان داری
Copilot داخل VS Code و JetBrains کار می‌کند و تکمیل خودکار خیلی خوبی دارد. اگر نمی‌خواهی ادیتورت را عوض کنی، انتخاب راحت‌تری است و ارزان‌تر هم هست.

## جمع‌بندی
- پروژه‌های بزرگ و تغییرات چندفایلی: **Cursor**
- تکمیل کد سریع در ادیتور فعلی، با بودجه کمتر: **Copilot**
- اگر بیشتر در ترمینال کار می‌کنی، **Claude Code** همراه Claude Pro را هم امتحان کن.`,
  },
];

/** Reading time in minutes (Persian text, ~200 words a minute). */
export const readMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).length / 200));
