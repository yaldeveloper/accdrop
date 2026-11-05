// AccDrop gift cards: store credit someone buys for someone else, with a design, a note and an optional delivery time.
// The recipient opens /gift/<code>, adds the amount to their AccDrop credit and spends it on anything in the store.
// Shared by the browser and the server (lib/server/gifts.ts).
import type { Product } from "./catalog";
import { fa } from "./format";

/** Catalog id of the gift card. Hidden from the store lists: it is bought from /gift. */
export const GIFT_ID = "accdrop-gift";

/** Amounts on sale, in Toman. */
export const GIFT_AMOUNTS = [200_000, 500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000] as const;

export const giftAmountLabel = (n: number) =>
  n >= 1_000_000 ? `${fa(n / 1_000_000)} میلیون تومان` : `${fa(n / 1000)} هزار تومان`;

/** The gift card as a catalog product, so orders, the admin panel and invoices show it like everything else. */
export const GIFT_PRODUCT: Product = {
  id: GIFT_ID, hidden: true, kind: "gift", axis: "مبلغ کارت", name: "AccDrop Gift Card", maker: "AccDrop", category: "apple", monogram: "AD",
  etaMinutes: 0, description: "کارت هدیه اعتبار اک‌دراپ", use: "هدیه‌ای که گیرنده خودش انتخابش می‌کند",
  plans: Object.fromEntries(GIFT_AMOUNTS.map((a) => [String(a), { code: a }])),
  labels: Object.fromEntries(GIFT_AMOUNTS.map((a) => [String(a), giftAmountLabel(a)])),
  types: { code: { title: "کارت هدیه", detail: "لینک و کد هدیه، فوری" } },
  deliver: "بلافاصله بعد از پرداخت، لینک هدیه ساخته می‌شود و (اگر شماره گیرنده را داده باشی) سر وقتش برایش پیامک می‌شود.",
  howTo: "گیرنده لینک را باز می‌کند، با شماره خودش وارد می‌شود و مبلغ به اعتبار اک‌دراپش اضافه می‌شود.",
  warranty: "بدون تاریخ انقضا",
  includes: ["قابل خرج روی همه محصولات اک‌دراپ", "طرح و پیام اختصاصی", "ارسال پیامکی در روز و ساعت دلخواه"],
};

export type GiftTheme = {
  id: string; title: string; /** Short line under the title on the card. */ line: string;
  /** Message prefilled in the builder. */ note: string;
  /** Card colours: background stops, accent, text. */ bg: [string, string]; accent: string; ink: string;
  /** Background motif drawn in CSS (app/gift/gift.css). */ motif: "dots" | "confetti" | "pomegranate" | "sprout" | "hearts" | "stars";
};

export const GIFT_THEMES: GiftTheme[] = [
  { id: "drop", title: "اک‌دراپ", line: "یک هدیه، به انتخاب خودت", note: "هر چی دوست داری بردار، مهمون من!", bg: ["#15191E", "#0B0D10"], accent: "#B9FF63", ink: "#F7F8F6", motif: "dots" },
  { id: "birthday", title: "تولدت مبارک", line: "یک سال دیگه، کلی ابزار تازه", note: "تولدت مبارک! امسال هر ابزاری که دلت می‌خواد مال تو.", bg: ["#FF7A59", "#C2185B"], accent: "#FFE66D", ink: "#FFFFFF", motif: "confetti" },
  { id: "yalda", title: "یلدا مبارک", line: "بلندترین شب، بهترین هدیه", note: "یلدات مبارک! این هم سهم تو از انار و هندونه‌ی امسال.", bg: ["#8E1B2C", "#3A0A12"], accent: "#FF4D5E", ink: "#FFF4E8", motif: "pomegranate" },
  { id: "nowruz", title: "نوروز مبارک", line: "سال نو، شروع تازه", note: "عیدت مبارک! سال نو با ابزارهای تازه شروع کن.", bg: ["#2E7D4F", "#0E3B26"], accent: "#F5D06F", ink: "#F7FFF4", motif: "sprout" },
  { id: "love", title: "برای تو", line: "چون خاصی", note: "یه هدیه کوچیک، برای کسی که خیلی برام مهمه.", bg: ["#FF5E8A", "#7B1E57"], accent: "#FFD1DC", ink: "#FFFFFF", motif: "hearts" },
  { id: "thanks", title: "ممنونم", line: "بابت همه‌چیز", note: "مرسی که همیشه هستی. این یکی مهمون من!", bg: ["#3A6FF7", "#14287A"], accent: "#9EF0FF", ink: "#FFFFFF", motif: "stars" },
];
export const themeById = (id: string | null | undefined) => GIFT_THEMES.find((t) => t.id === id) ?? GIFT_THEMES[0];

export const GIFT_LIMITS = { name: 40, message: 280 } as const;

/** What anyone with the link sees. Details stay hidden until the delivery time unless you are the sender. */
export type GiftView = {
  code: string; amount: number; theme: string; fromName: string; toName: string; message: string;
  /** Delivery time set by the sender (null = right away). */
  sendAt: number | null;
  /** Not delivered yet: the page shows a countdown instead of the card. */
  locked: boolean;
  redeemed: boolean; redeemedAt: number | null;
  /** The person looking is the sender, or the one who redeemed it. */
  mine: "sender" | "receiver" | null;
};

/** The sender's view of a gift they bought. */
export type SentGift = {
  code: string; orderCode: string; amount: number; theme: string; toName: string; toMobile: string | null;
  sendAt: number | null; sentAt: number | null; openedAt: number | null; redeemedAt: number | null; paid: boolean;
};

export type CreditEntry = { amount: number; reason: "gift" | "order" | "admin"; ref: string; at: number };

/** «K7M2-Q9XA-P3HD»: how a gift code is shown and typed (the link uses it without dashes). */
export const showCode = (c: string) => c.replace(/[^A-Z0-9]/gi, "").toUpperCase().replace(/(.{4})(?=.)/g, "$1-");
export const cleanCode = (c: string) => c.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
export const giftPath = (code: string) => `/gift/${cleanCode(code)}`;
