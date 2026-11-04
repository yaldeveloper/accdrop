// Live virtual numbers (5sim.net): shared names and helpers used by the browser and the server.
// A live number is sold as a normal order line of the "vnumber" product whose plan is `5s:<country>:<service>`,
// e.g. `5s:england:telegram`. The price is set by the server from 5sim's live price when the order is created.

export const LIVE_PREFIX = "5s:";
export const NUMBER_PRODUCT = "vnumber";

/** Services offered on the virtual number page (5sim product name → our label). Order = order on the page. */
export const NUMBER_SERVICES: { id: string; name: string; fa: string }[] = [
  { id: "telegram", name: "Telegram", fa: "تلگرام" },
  { id: "whatsapp", name: "WhatsApp", fa: "واتس‌اپ" },
  { id: "instagram", name: "Instagram", fa: "اینستاگرام" },
  { id: "google", name: "Google / Gmail", fa: "گوگل و جیمیل" },
  { id: "openai", name: "OpenAI / ChatGPT", fa: "ChatGPT" },
  { id: "microsoft", name: "Microsoft", fa: "مایکروسافت" },
  { id: "apple", name: "Apple", fa: "اپل" },
  { id: "discord", name: "Discord", fa: "دیسکورد" },
  { id: "twitter", name: "X / Twitter", fa: "ایکس (توییتر)" },
  { id: "facebook", name: "Facebook", fa: "فیسبوک" },
  { id: "tiktok", name: "TikTok", fa: "تیک‌تاک" },
  { id: "amazon", name: "Amazon", fa: "آمازون" },
  { id: "linkedin", name: "LinkedIn", fa: "لینکدین" },
  { id: "snapchat", name: "Snapchat", fa: "اسنپ‌چت" },
];

/** Persian names of 5sim country slugs. Countries not listed fall back to 5sim's English name. */
export const COUNTRY_FA: Record<string, string> = {
  usa: "آمریکا", england: "انگلیس", canada: "کانادا", netherlands: "هلند", germany: "آلمان", france: "فرانسه",
  russia: "روسیه", ukraine: "اوکراین", kazakhstan: "قزاقستان", india: "هند", indonesia: "اندونزی", philippines: "فیلیپین",
  vietnam: "ویتنام", thailand: "تایلند", malaysia: "مالزی", cambodia: "کامبوج", laos: "لائوس", myanmar: "میانمار",
  china: "چین", hongkong: "هنگ‌کنگ", japan: "ژاپن", southkorea: "کره جنوبی", pakistan: "پاکستان", bangladesh: "بنگلادش",
  srilanka: "سریلانکا", nepal: "نپال", afghanistan: "افغانستان", turkey: "ترکیه", georgia: "گرجستان", armenia: "ارمنستان",
  azerbaijan: "آذربایجان", uzbekistan: "ازبکستان", kyrgyzstan: "قرقیزستان", tajikistan: "تاجیکستان", turkmenistan: "ترکمنستان",
  iraq: "عراق", saudiarabia: "عربستان", uae: "امارات", oman: "عمان", qatar: "قطر", kuwait: "کویت", bahrain: "بحرین",
  jordan: "اردن", israel: "اسرائیل", egypt: "مصر", morocco: "مراکش", algeria: "الجزایر", tunisia: "تونس",
  nigeria: "نیجریه", kenya: "کنیا", ghana: "غنا", southafrica: "آفریقای جنوبی", ethiopia: "اتیوپی", tanzania: "تانزانیا",
  uganda: "اوگاندا", cameroon: "کامرون", ivorycoast: "ساحل عاج", senegal: "سنگال",
  poland: "لهستان", romania: "رومانی", bulgaria: "بلغارستان", czech: "چک", slovakia: "اسلواکی", hungary: "مجارستان",
  austria: "اتریش", switzerland: "سوئیس", belgium: "بلژیک", spain: "اسپانیا", portugal: "پرتغال", italy: "ایتالیا",
  greece: "یونان", cyprus: "قبرس", ireland: "ایرلند", sweden: "سوئد", finland: "فنلاند", norway: "نروژ", denmark: "دانمارک",
  estonia: "استونی", latvia: "لتونی", lithuania: "لیتوانی", moldova: "مولداوی", belarus: "بلاروس", serbia: "صربستان",
  croatia: "کرواسی", slovenia: "اسلوونی", bosnia: "بوسنی", macedonia: "مقدونیه", albania: "آلبانی", montenegro: "مونته‌نگرو",
  brazil: "برزیل", argentina: "آرژانتین", mexico: "مکزیک", colombia: "کلمبیا", chile: "شیلی", peru: "پرو",
  venezuela: "ونزوئلا", ecuador: "اکوادور", bolivia: "بولیوی", paraguay: "پاراگوئه", uruguay: "اوروگوئه",
  australia: "استرالیا", newzealand: "نیوزیلند",
};

export type LivePlan = { country: string; service: string };

/** `5s:england:telegram` → { country, service }, or null for any other plan key. */
export function livePlan(plan: string): LivePlan | null {
  if (!plan.startsWith(LIVE_PREFIX)) return null;
  const [country, service] = plan.slice(LIVE_PREFIX.length).split(":");
  return /^[a-z0-9_]{2,40}$/.test(country ?? "") && /^[a-z0-9_]{2,40}$/.test(service ?? "") ? { country, service } : null;
}
export const livePlanKey = (country: string, service: string) => `${LIVE_PREFIX}${country}:${service}`;

export const serviceFa = (id: string) => NUMBER_SERVICES.find((s) => s.id === id)?.fa ?? id;
export const countryFa = (slug: string, en?: string) => COUNTRY_FA[slug] ?? en ?? slug;
/** «تلگرام • انگلیس». */
export const livePlanLabel = (plan: string) => {
  const l = livePlan(plan);
  return l ? `${serviceFa(l.service)} • ${countryFa(l.country)}` : plan;
};

/** What the customer sees about a live number on the order page. */
export type NumberState = {
  status: "BUYING" | "PENDING" | "RECEIVED" | "FINISHED" | "CANCELED" | "TIMEOUT" | "BANNED" | "FAILED";
  phone?: string;
  /** ms epoch when 5sim stops waiting for a code. */
  expiresAt?: number;
  codes: { code: string; text: string; at: number }[];
  /** Numbers already tried for this line (a new one can be requested a few times when no code arrives). */
  tries: number;
  canRetry?: boolean;
};
export const MAX_NUMBER_TRIES = 3;
