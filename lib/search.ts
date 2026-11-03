// Finding a service: Persian and English names, common misspellings and what people need it for.
import { CATEGORIES, PRODUCTS, listed, minPrice, type Category, type Product } from "./catalog";

/** Lower-case, unify Arabic/Persian letters and digits, drop spaces, ZWNJ and punctuation. */
export function norm(s: string) {
  return s.toLowerCase()
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[‌‏‎\s\-_.،,()+]/g, "");
}

/** Other names people type. The product name, maker and category are always searched too. */
const ALIASES: Record<string, string[]> = {
  chatgpt: ["چت جی پی تی", "چت‌جی‌پی‌تی", "جی پی تی", "gpt", "openai", "اپن ای آی", "chat gpt", "پلاس"],
  claude: ["کلود", "کلاد", "anthropic", "آنتروپیک"],
  gemini: ["جمینای", "جمنای", "gemini", "گوگل وان", "google one", "بارد"],
  perplexity: ["پرپلکسیتی", "پرپلکسی"],
  grok: ["گراک", "گروک", "ایکس", "x ai", "twitter"],
  cursor: ["کرسر", "کِرسر", "ide"],
  copilot: ["کوپایلوت", "گیت هاب", "github"],
  adobe: ["ادوبی", "فتوشاپ", "photoshop", "ایلوستریتور", "illustrator", "پریمیر", "premiere", "افترافکت", "aftereffects", "لایت روم", "lightroom"],
  canva: ["کنوا", "کانوا"],
  capcut: ["کپ کات", "کپکات", "تدوین موبایل"],
  kling: ["کلینگ", "ساخت ویدیو با هوش مصنوعی"],
  notion: ["نوشن", "ناشن"],
  tgpremium: ["تلگرام پرمیوم", "پریمیوم تلگرام", "تلگرام پریمیوم", "telegram"],
  tgstars: ["استارز", "ستاره تلگرام", "stars"],
  appleid: ["اپل آیدی", "اپل ایدی", "apple id", "آیکلود", "icloud", "اپ استور", "appstore"],
  applegift: ["گیفت کارت", "گیفت اپل", "آیتونز", "ایتونز", "itunes", "اپل گیفت", "giftcard"],
  linkedin: ["لینکدین", "لینکداین", "کاریابی"],
  duolingo: ["دولینگو", "دوولینگو", "زبان انگلیسی", "یادگیری زبان"],
  vnumber: ["شماره مجازی", "شماره خارجی", "virtual number", "sms", "کد تایید", "شماره آمریکا"],
};

/** Plain needs mapped to services, for the «what is it for» chips. */
export const NEEDS: { label: string; ids: string[] }[] = [
  { label: "نوشتن و ترجمه", ids: ["chatgpt", "claude", "gemini"] },
  { label: "برنامه‌نویسی", ids: ["cursor", "copilot", "claude", "chatgpt"] },
  { label: "طراحی و عکس", ids: ["adobe", "canva", "chatgpt"] },
  { label: "ساخت ویدیو", ids: ["capcut", "kling", "adobe"] },
  { label: "تحقیق و مقاله", ids: ["perplexity", "gemini", "chatgpt"] },
  { label: "اپ‌استور و اپل", ids: ["applegift", "appleid"] },
  { label: "یادگیری زبان", ids: ["duolingo"] },
  { label: "کار و رزومه", ids: ["linkedin", "notion"] },
];

type Ix = { key: string; name: string; alias: string[]; text: string };
const cache = new Map<string, Ix>();
/** Search text of a product, cached (and rebuilt when the admin edits it). */
function ixOf(p: Product): Ix {
  const key = `${p.name}|${p.description}|${p.use}|${p.includes.length}`;
  const hit = cache.get(p.id);
  if (hit && hit.key === key) return hit;
  const ix = {
    key,
    name: norm(`${p.name} ${p.maker} ${p.id} ${p.tier ?? ""}`),
    alias: (ALIASES[p.id] ?? ALIASES[p.family ?? ""] ?? []).map(norm),
    text: norm(`${p.description} ${p.use} ${p.includes.join(" ")} ${CATEGORIES[p.category]}`),
  };
  cache.set(p.id, ix);
  return ix;
}

/** Scores a product for a query: name or alias beats a word in its description. 0 = no match. */
export function score(p: Product, query: string) {
  const q = norm(query);
  if (!q) return 1;
  const ix = ixOf(p);
  if (ix.name.startsWith(q) || ix.alias.some((a) => a.startsWith(q))) return 100;
  if (ix.name.includes(q) || ix.alias.some((a) => a.includes(q))) return 60;
  if (ix.text.includes(q)) return 20;
  return 0;
}

export function searchProducts(query: string) {
  return PRODUCTS.map((p, i) => ({ p, s: score(p, query), i }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.p);
}

export type SortKey = "featured" | "cheap" | "fast";
export const SORTS: Partial<Record<SortKey, string>> = { featured: "پیشنهاد ما", cheap: "ارزان‌ترین" };

export function browse(opts: { cat: "all" | Category; query: string; sort: SortKey; instant: boolean; need?: string }) {
  const need = NEEDS.find((n) => n.label === opts.need);
  let list = opts.query.trim() ? searchProducts(opts.query) : listed();
  if (opts.cat !== "all") list = list.filter((p) => p.category === opts.cat);
  if (opts.instant) list = list.filter((p) => p.etaMinutes === 0);
  if (need) list = need.ids.map((id) => list.find((p) => p.id === id)).filter((p): p is Product => !!p);
  if (opts.sort === "cheap") list.sort((a, b) => minPrice(a) - minPrice(b));
  if (opts.sort === "fast") list.sort((a, b) => a.etaMinutes - b.etaMinutes);
  return list;
}

export const countIn = (cat: "all" | Category) => (cat === "all" ? listed().length : listed().filter((p) => p.category === cat).length);
