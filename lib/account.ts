// Accounts and orders: shared types and helpers used by both the browser and the server (lib/server).
import { productById, type Selection } from "./catalog";
import { clubPoints } from "./format";

export type User = { mobile: string; name: string; email: string; createdAt: number };
export type OrderLine = Selection & {
  price: number; email?: string; username?: string;
  /** Extra activation emails for a group buy (seats beyond the first). */
  members?: string[];
  /** Server fields: line id, and what was delivered (gift code, number or login) once it is ready. */
  lineId?: number; secret?: string; deliveredAt?: number | null;
};
/** pending = waiting for payment, canceled = payment failed or abandoned. */
export type OrderStatus = "pending" | "paid" | "activating" | "active" | "canceled" | "refunded";
export type Order = {
  code: string; createdAt: number; lines: OrderLine[]; subtotal: number; discount: number; total: number; mobile: string;
  status: OrderStatus; paidAt?: number | null; activatedAt?: number | null; refId?: string; adminNote?: string;
};

export type Stage = 0 | 1 | 2; // paid, activating, active
export const STAGES = ["پرداخت شد", "در حال فعال‌سازی", "فعال شد"] as const;
export const STATUS_TITLE: Record<OrderStatus, string> = {
  pending: "در انتظار پرداخت", paid: "پرداخت شد", activating: "در حال فعال‌سازی", active: "فعال شد", canceled: "پرداخت نشد", refunded: "بازپرداخت شد",
};
export const isPaid = (o: Order) => o.status === "paid" || o.status === "activating" || o.status === "active";

const DAY = 86_400_000;

export const DEMO_OTP = "12345";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function stageOf(o: Order, _now?: number): Stage {
  return o.status === "active" ? 2 : o.status === "activating" ? 1 : 0;
}

/** A purchased line once active: when it started and when it runs out. */
export function passWindow(o: Order, l: OrderLine) {
  const start = o.activatedAt ?? o.paidAt ?? o.createdAt;
  const end = start + Number(l.plan) * 30 * DAY;
  return { start, end, totalDays: Number(l.plan) * 30 };
}

export const daysLeft = (end: number, now: number) => Math.max(0, Math.ceil((end - now) / DAY));

export const TIERS = [
  { key: "MEMBER", title: "عضو", from: 1, perks: ["امتیاز هر خرید", "تمدید یک‌کلیکی"] },
  { key: "INSIDER", title: "اینسایدر", from: 3, perks: ["دراپ‌ها زودتر", "۵٪ تخفیف تمدید"] },
  { key: "PRIME", title: "پرایم", from: 10, perks: ["دراپ‌های اختصاصی", "کارشناس شخصی"] },
] as const;

export function clubOf(all: Order[]) {
  const orders = all.filter(isPaid);
  const points = orders.reduce((s, o) => s + clubPoints(o.total), 0);
  const n = orders.length;
  const tierIndex = n >= 10 ? 2 : n >= 3 ? 1 : 0;
  const next = TIERS[tierIndex + 1];
  return { points, orders: n, tier: TIERS[tierIndex], next, toNext: next ? next.from - n : 0 };
}

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
  createdAt: number; status: "pending" | "approved" | "rejected";
};

export const RESELLER_TIERS = [
  { key: "bronze", title: "برنزی", rate: 0.08, need: "از اولین فروش" },
  { key: "silver", title: "نقره‌ای", rate: 0.12, need: "فروش ماهانه بالای ۲۰ میلیون تومان" },
  { key: "gold", title: "طلایی", rate: 0.16, need: "فروش ماهانه بالای ۸۰ میلیون تومان" },
] as const;

export const RESELLER_KINDS = ["کانال تلگرام یا پیج اینستاگرام", "فروشگاه اینترنتی", "فروشگاه حضوری یا کافی‌نت", "فریلنسر یا آژانس", "سایر"];
export const RESELLER_VOLUMES = ["کمتر از ۱۰ سفارش در ماه", "۱۰ تا ۵۰ سفارش در ماه", "بیشتر از ۵۰ سفارش در ماه"];
