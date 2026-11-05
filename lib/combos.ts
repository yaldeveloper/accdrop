// Combo packs («پک»): a few products that go well together, sold with a pack discount.
//
// A pack is not a product of its own. Adding it puts each item in the cart as a normal line tagged with the pack id,
// so checkout, payment and delivery stay exactly as they are: every item is bought from its own supplier and
// delivered on its own line. The discount is applied per line (on the server too) only while every item of the pack is
// in the cart, and is capped so the pack never sells below MIN_MARKUP over our supplier cost, even after a supplier
// raises its price. Discount codes don't stack on pack lines.
import { type DeliveryType, type Selection, PRODUCTS, isOut, linePrice, priceOf, productById, sellable } from "./catalog";
import { codeProduct } from "./catalog-sync";

export type ComboItem = {
  id: string; plan: string; type: DeliveryType;
  /** Supplier cost in USDT when the product has none in code (Insight Store items); used for the margin floor. */
  cost?: number;
};

export type Combo = {
  id: string;
  name: string;
  /** Who it is for, one short line. */
  tagline: string;
  /** What you can do with it, in plain words. */
  pitch: string;
  /** Percent off the sum of the items. The margin floor may lower it. */
  off: number;
  items: ComboItem[];
  /** Small label on the card, e.g. «پرفروش». */
  badge?: string;
};

/** A pack never sells below this many times our supplier cost (16%: room for gateway fees and replacements). */
export const MIN_MARKUP = 1.16;

// Costs and prices (USDT) checked on 2026-11-05 against lib/catalog.ts:
//   everyday  9.9+4.9+6.5 = 21.3,  cost 7.5+2.77+3.96 = 14.23           → −10% = 19.17 (+35%)
//   creator   9.9+2.9+5.9+8.9 = 27.6, cost 7.5+1.89+3.5+5.5 = 18.39    → −12% = 24.29 (+32%)
//   developer 18.9+15.5+5.9 = 40.3, cost 14.3+12+3.22 = 29.52          → −8%  = 37.08 (+26%)
//   student   5.9+6.5+9.9+2.9 = 25.2, cost 3.97+3.96+7.24+1 = 16.17    → −12% = 22.18 (+37%)
//   work      9.9+8.9+4.5+3.5 = 26.8, cost 7.5+6.47+2.81+1.4 = 18.18   → −10% = 24.12 (+33%)
//   fun       9.9+11.95+5.5 = 27.35, cost 7.5+11.05+3.1 = 21.65        → −7%  = 25.44 (+18%)
export const COMBOS: Combo[] = [
  { id: "everyday", name: "پک هوش مصنوعی روزمره", tagline: "برای همه؛ نوشتن، جست‌وجو و کار روزانه", badge: "پرفروش", off: 10,
    pitch: "ChatGPT برای فکر کردن و نوشتن، Gemini برای جست‌وجو و Gmail، و Grammarly که متن انگلیسی‌ات را بی‌غلط می‌کند.",
    items: [{ id: "chatgpt", plan: "1", type: "code", cost: 7.5 }, { id: "google-ai-pro", plan: "6", type: "code" }, { id: "grammarly-pro", plan: "1", type: "code" }] },
  { id: "creator", name: "پک تولید محتوا", tagline: "برای یوتیوبر، اینستاگرامر و ادیتور", off: 12,
    pitch: "ایده و متن با ChatGPT، صداگذاری با ElevenLabs، ویدئو با Kling و تدوین نهایی با CapCut؛ یک ویدئو از صفر تا انتشار.",
    items: [{ id: "chatgpt", plan: "1", type: "code", cost: 7.5 }, { id: "capcut", plan: "1", type: "code" }, { id: "elevenlabs-vibi", plan: "131k", type: "code" }, { id: "kling-account", plan: "1", type: "code" }] },
  { id: "developer", name: "پک برنامه‌نویس", tagline: "برای کدنویسی سریع‌تر با هوش مصنوعی", off: 8,
    pitch: "Cursor Pro به‌همراه SuperGrok برای نوشتن کد، ترمینال هوشمند Warp برای یک سال و اعتبار Codex API برای ایجنت‌ها و اسکریپت‌هایت.",
    items: [{ id: "grok-cursor", plan: "1", type: "code" }, { id: "warp", plan: "12", type: "code", cost: 12 }, { id: "codex-api", plan: "50m", type: "code" }] },
  { id: "student", name: "پک دانشجو", tagline: "برای درس، مقاله و زبان", off: 12,
    pitch: "ChatGPT Go برای سه ماه، Grammarly برای مقاله، Quizlet برای مرور و فلش‌کارت و Microsoft 365 برای Word و PowerPoint.",
    items: [{ id: "chatgpt-go", plan: "3", type: "code" }, { id: "grammarly-pro", plan: "1", type: "code" }, { id: "quizlet", plan: "12", type: "code" }, { id: "microsoft-365-personal", plan: "1", type: "code" }] },
  { id: "work", name: "پک کار و ارائه", tagline: "برای فریلنسر و تیم‌های کوچک", off: 10,
    pitch: "ChatGPT برای ایمیل و گزارش، Gamma برای ساختن ارائه در چند دقیقه، Zoom بدون محدودیت ۴۰ دقیقه و Notion Business برای برنامه‌ریزی.",
    items: [{ id: "chatgpt", plan: "1", type: "code", cost: 7.5 }, { id: "gamma", plan: "1", type: "code" }, { id: "zoom", plan: "1", type: "code" }, { id: "notion-business", plan: "3", type: "code" }] },
  { id: "fun", name: "پک هوش و سرگرمی", tagline: "ChatGPT، موسیقی و فیلم با هم", off: 7,
    pitch: "ChatGPT Plus برای کار، یک ماه Deezer Premium برای موسیقی بدون تبلیغ و یک سال Apple TV+ برای فیلم و سریال.",
    items: [{ id: "chatgpt", plan: "1", type: "code", cost: 7.5 }, { id: "deezer", plan: "1", type: "code" }, { id: "apple-tv", plan: "12", type: "code" }] },
];

export const comboById = (id: string | undefined) => (id ? COMBOS.find((c) => c.id === id) : undefined);

/** The product of a pack item, when it is on sale right now (visible, option exists, supplier in stock). */
const live = (it: ComboItem) => {
  const p = PRODUCTS.find((x) => x.id === it.id);
  return p && !p.hidden && sellable(p, { id: it.id, plan: it.plan, type: it.type }) && !isOut(p, it.plan, it.type) ? p : undefined;
};
/** Every item of the pack can be bought right now. */
export const comboAvailable = (c: Combo) => c.items.every((it) => !!live(it));

/** Our supplier cost of one item, as a share of its selling price (USDT cost / USDT price), or null when unknown. */
function costShare(it: ComboItem): number | null {
  // Supplier costs in code move with the supplier sync, and so does the selling price. A fixed `cost` was set against
  // the code's price, and the sync moves that price with the supplier, so compare it with the code price.
  const p = it.cost ? codeProduct(it.id) ?? productById(it.id) : productById(it.id);
  const cost = p.qd?.[it.plan]?.cost ?? p.cb?.[it.plan]?.cost ?? p.cr?.[it.plan]?.cost ?? it.cost;
  const u = p.usdt?.[it.plan];
  const sell = typeof u === "number" ? u : u?.[it.type];
  return cost && sell ? cost / sell : null;
}

/** Percent off the pack actually gets: its `off`, lowered when needed so the pack stays above MIN_MARKUP × cost. */
export function comboOff(c: Combo): number {
  const prices = c.items.map((it) => priceOf({ id: it.id, plan: it.plan, type: it.type }).price);
  const full = prices.reduce((s, x) => s + x, 0);
  if (!full) return 0;
  const shares = c.items.map(costShare);
  if (shares.some((s) => s === null)) return c.off;
  const floor = prices.reduce((s, x, i) => s + x * shares[i]! * MIN_MARKUP, 0);
  const most = Math.floor((1 - floor / full) * 100);
  return Math.max(0, Math.min(c.off, most));
}

/** Full price of the pack, its price after the pack discount, and the Toman saved. */
export function comboPrice(c: Combo) {
  const full = c.items.reduce((s, it) => s + priceOf({ id: it.id, plan: it.plan, type: it.type }).price, 0);
  const off = comboOff(c);
  const price = c.items.reduce((s, it) => s + itemPrice(it, off), 0);
  return { full, price, save: full - price, off };
}

/** One item's price inside a pack, rounded to 1,000 Toman. */
const itemPrice = (it: ComboItem, off: number) => Math.round((priceOf({ id: it.id, plan: it.plan, type: it.type }).price * (100 - off)) / 100 / 1000) * 1000;

/** The cart lines that add a pack. */
export const comboLines = (c: Combo): Selection[] => c.items.map((it) => ({ id: it.id, plan: it.plan, type: it.type, combo: c.id }));

const matches = (l: Selection, it: ComboItem) => l.id === it.id && l.plan === it.plan && l.type === it.type && (l.seats ?? 1) === 1;

/** Packs whose every item is in `lines`, tagged with the pack and bought once (one line per item). */
export function completeCombos(lines: Selection[]): Set<string> {
  const ok = new Set<string>();
  for (const id of new Set(lines.map((l) => l.combo).filter(Boolean) as string[])) {
    const c = comboById(id);
    const tagged = lines.filter((l) => l.combo === id);
    if (c && tagged.length === c.items.length && c.items.every((it) => tagged.filter((l) => matches(l, it)).length === 1)) ok.add(id);
  }
  return ok;
}

/** Price of every line of a cart or order: a line of a complete pack gets the pack discount (add-ons like a static IP
 *  are not discounted); every other line keeps its normal price and loses any stale pack tag. */
export function pricedLines<T extends Selection>(lines: T[]): (T & { price: number })[] {
  const ok = completeCombos(lines);
  return lines.map((l) => {
    const c = l.combo && ok.has(l.combo) ? comboById(l.combo) : undefined;
    if (!c) return { ...l, combo: undefined, price: linePrice(l) };
    const it = c.items.find((x) => matches(l, x))!;
    return { ...l, price: linePrice(l) - priceOf(l).price + itemPrice(it, comboOff(c)) };
  });
}
