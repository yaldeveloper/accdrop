// Accounts and orders.
// DEMO BACKEND: everything below is stored in the browser (localStorage) so the full flow can be tried
// without a server. Replace these functions with API calls (SMS OTP, payment gateway callback, order service).
import { productById, type Selection } from "./catalog";
import { clubPoints } from "./format";

export type User = { mobile: string; name: string; email: string; createdAt: number };
export type OrderLine = Selection & { price: number; email?: string; username?: string };
export type Order = { code: string; createdAt: number; lines: OrderLine[]; subtotal: number; discount: number; total: number; mobile: string };

export type Stage = 0 | 1 | 2; // paid, activating, active
export const STAGES = ["پرداخت شد", "در حال فعال‌سازی", "فعال شد"] as const;

/** Demo timing: an order "activates" this many ms after payment. In production this comes from the order service. */
export const DEMO_ACTIVATION_MS = 25_000;
const DAY = 86_400_000;

export const DEMO_OTP = "12345";

export function stageOf(o: Order, now: number): Stage {
  const t = now - o.createdAt;
  // Instant products (gift codes, virtual numbers) are delivered automatically right after payment.
  if (o.lines.every((l) => productById(l.id).etaMinutes === 0)) return t < 1_500 ? 0 : 2;
  if (t < 3_000) return 0;
  if (t < DEMO_ACTIVATION_MS) return 1;
  return 2;
}

/** A purchased line once active: when it started and when it runs out. */
export function passWindow(o: Order, l: OrderLine) {
  const start = o.createdAt + DEMO_ACTIVATION_MS;
  const end = start + Number(l.plan) * 30 * DAY;
  return { start, end, totalDays: Number(l.plan) * 30 };
}

export const daysLeft = (end: number, now: number) => Math.max(0, Math.ceil((end - now) / DAY));

export const TIERS = [
  { key: "MEMBER", title: "عضو", from: 1, perks: ["امتیاز هر خرید", "تمدید یک‌کلیکی"] },
  { key: "INSIDER", title: "اینسایدر", from: 3, perks: ["دراپ‌ها زودتر", "۵٪ تخفیف تمدید"] },
  { key: "PRIME", title: "پرایم", from: 10, perks: ["دراپ‌های اختصاصی", "کارشناس شخصی"] },
] as const;

export function clubOf(orders: Order[]) {
  const points = orders.reduce((s, o) => s + clubPoints(o.total), 0);
  const n = orders.length;
  const tierIndex = n >= 10 ? 2 : n >= 3 ? 1 : 0;
  const next = TIERS[tierIndex + 1];
  return { points, orders: n, tier: TIERS[tierIndex], next, toNext: next ? next.from - n : 0 };
}

/** Sample discount codes for the demo. */
export const DISCOUNTS: Record<string, number> = { WELCOME: 0.1 };

export const newOrderCode = () => `AD-${Math.floor(40000 + Math.random() * 59999)}`;

export const lineTitle = (l: Selection) => productById(l.id).name;

export const validMobile = (m: string) => /^09\d{9}$/.test(normalizeMobile(m));
export const normalizeMobile = (m: string) => {
  const d = m.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/\D/g, "");
  return d.startsWith("98") ? `0${d.slice(2)}` : d.startsWith("9") ? `0${d}` : d;
};
export const validEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim());
/** Telegram username: 5–32 letters, digits or underscores, with or without @. */
export const validUsername = (u: string) => /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(u.trim());
export const normalizeUsername = (u: string) => "@" + u.trim().replace(/^@/, "");

// ----- Reseller program (sample terms; confirm the real percentages before launch) -----
export type ResellerApp = {
  mobile: string; business: string; kind: string; link: string; volume: string; note: string;
  createdAt: number; status: "pending" | "approved";
};

export const RESELLER_TIERS = [
  { key: "bronze", title: "برنزی", rate: 0.08, need: "از اولین فروش" },
  { key: "silver", title: "نقره‌ای", rate: 0.12, need: "فروش ماهانه بالای ۲۰ میلیون تومان" },
  { key: "gold", title: "طلایی", rate: 0.16, need: "فروش ماهانه بالای ۸۰ میلیون تومان" },
] as const;

export const RESELLER_KINDS = ["کانال تلگرام یا پیج اینستاگرام", "فروشگاه اینترنتی", "فروشگاه حضوری یا کافی‌نت", "فریلنسر یا آژانس", "سایر"];
export const RESELLER_VOLUMES = ["کمتر از ۱۰ سفارش در ماه", "۱۰ تا ۵۰ سفارش در ماه", "بیشتر از ۵۰ سفارش در ماه"];
