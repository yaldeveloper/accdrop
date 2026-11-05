import { ALL_PRODUCTS } from "./catalog";
// Per-product identity: brand colours and the kind of scene the product page shows.
export type Motif = "chat" | "code" | "canvas" | "video" | "doc" | "work" | "lang" | "tg" | "stars" | "gift" | "appleid" | "sim";
export type Theme = { c: string; c2: string; motif: Motif; ask?: string; reply?: string };

export const THEME: Record<string, Theme> = {
  chatgpt: { c: "#10A37F", c2: "#7CE0C3", motif: "chat", ask: "یک ایمیل رسمی برای تمدید قرارداد بنویس", reply: "حتماً. پیش‌نویس با لحن رسمی و سه گزینه برای عنوان آماده است…" },
  claude: { c: "#D97757", c2: "#F2C6A8", motif: "chat", ask: "این قرارداد ۴۰ صفحه‌ای را خلاصه کن", reply: "خلاصه در ۷ بند، به‌همراه سه ریسک مهم که باید قبل از امضا ببینی…" },
  gemini: { c: "#4F8DFD", c2: "#B79CFF", motif: "chat", ask: "ایمیل‌های این هفته را خلاصه کن", reply: "۱۲ ایمیل جدید داری؛ سه مورد نیاز به پاسخ امروز دارند…" },
  perplexity: { c: "#20B8CD", c2: "#9BE7F0", motif: "chat", ask: "بهترین لپ‌تاپ برنامه‌نویسی زیر ۱۰۰۰ دلار؟", reply: "بر اساس ۸ منبع معتبر، سه گزینه با مقایسه باتری و رم…" },
  grok: { c: "#E7E9EA", c2: "#8B98A5", motif: "chat", ask: "امروز در X درباره هوش مصنوعی چه خبر است؟", reply: "سه موضوع داغ امروز، با پست‌های اصلی و واکنش‌ها…" },
  cursor: { c: "#7C9CFF", c2: "#C7D3FF", motif: "code" },
  copilot: { c: "#A371F7", c2: "#D2B8FF", motif: "code" },
  adobe: { c: "#FF3B30", c2: "#FF9A62", motif: "canvas" },
  canva: { c: "#00C4CC", c2: "#8B3DFF", motif: "canvas" },
  capcut: { c: "#3DDBD9", c2: "#E8E8E8", motif: "video" },
  kling: { c: "#3CE38A", c2: "#C3F7DA", motif: "video" },
  notion: { c: "#EDEBE7", c2: "#9B9A97", motif: "doc" },
  linkedin: { c: "#2E8BE6", c2: "#E8B64C", motif: "work" },
  duolingo: { c: "#58CC02", c2: "#FFC800", motif: "lang" },
  tgpremium: { c: "#8B6CFF", c2: "#E07BD8", motif: "tg" },
  tgstars: { c: "#FFB800", c2: "#FFE08A", motif: "stars" },
  appleid: { c: "#C9CDD2", c2: "#6E7378", motif: "appleid" },
  applegift: { c: "#FF5A8A", c2: "#7A6BFF", motif: "gift" },
  vnumber: { c: "#B9FF63", c2: "#63E6BE", motif: "sim" },
  googleplay: { c: "#34A853", c2: "#FBBC04", motif: "gift" },
  steam: { c: "#66C0F4", c2: "#C7D5E0", motif: "gift" },
  playstation: { c: "#2E6DB4", c2: "#9CC2F0", motif: "gift" },
  xbox: { c: "#3FB43F", c2: "#B5E8B5", motif: "gift" },
  nintendo: { c: "#E60012", c2: "#FF8A8A", motif: "gift" },
  razer: { c: "#44D62C", c2: "#B8F5AE", motif: "gift" },
  pubg: { c: "#F2A900", c2: "#FFE08A", motif: "gift" },
  freefire: { c: "#FF7A00", c2: "#FFC38A", motif: "gift" },
  valorant: { c: "#FF4655", c2: "#FFB0B6", motif: "gift" },
  roblox: { c: "#E2E2E2", c2: "#9A9A9A", motif: "gift" },
  manus: { c: "#E8E6E1", c2: "#9A968E", motif: "chat", ask: "یک گزارش بازار از ۱۰ رقیب ما آماده کن", reply: "در حال جست‌وجو… گزارش با جدول مقایسه و منابع تا چند دقیقه دیگر آماده است." },
  elevenlabs: { c: "#E9E9E9", c2: "#A7A7A7", motif: "video" },
  lovable: { c: "#FF5A8A", c2: "#FF9A62", motif: "code" },
  warp: { c: "#01A4FF", c2: "#9BDCFF", motif: "code" },
  framer: { c: "#3D7BFF", c2: "#B2C8FF", motif: "canvas" },
  "adobe-express": { c: "#FF3B30", c2: "#B57BFF", motif: "canvas" },
  airtable: { c: "#18BFFF", c2: "#FFB400", motif: "doc" },
};

export function themeOf(id: string): Theme {
  const p = ALL_PRODUCTS.find((x) => x.id === id);
  const byCat: Record<string, Motif> = { ai: "chat", code: "code", create: "canvas", work: "work", telegram: "tg", apple: "gift", music: "gift", game: "gift", number: "sim" };
  const t = THEME[id] ?? (p?.family ? THEME[p.family] : undefined) ?? { c: "#B9FF63", c2: "#63E6BE", motif: byCat[p?.category ?? "ai"] ?? "chat",
    ask: "از کجا شروع کنم؟", reply: `با ${p?.name ?? "این سرویس"} چند دقیقه‌ای راه می‌افتی؛ قدم اول را با هم برداریم…` };
  const color = p?.color;
  return color ? { ...t, c: color } : t;
}
