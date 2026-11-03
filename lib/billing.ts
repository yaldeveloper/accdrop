// Shared (browser + server): installments, legal buyer details for official invoices, and «دنگ» (split payment) types.

/** Pay-later (SnappPay): four interest-free parts; shown for orders from `min` Toman. */
export const INSTALLMENTS = { parts: 4, min: 500_000, provider: "اسنپ‌پی" } as const;
export const installment = (total: number) => Math.ceil(total / INSTALLMENTS.parts / 1000) * 1000;
export const canInstall = (total: number) => total >= INSTALLMENTS.min;

export type PayMethod = "card" | "crypto" | "bnpl";
export const PAY_TITLE: Record<PayMethod, string> = { card: "درگاه بانکی", crypto: "ارز دیجیتال", bnpl: "اقساطی (اسنپ‌پی)" };

// ----- Official invoice («فاکتور رسمی») -----
export type LegalKind = "company" | "person";
export type LegalInfo = {
  kind: LegalKind;
  /** Company name, or the person's full name. */
  name: string;
  /** شناسه ملی (11 digits) for a company, کد ملی (10 digits) for a person. */
  nationalId: string;
  /** کد اقتصادی (optional). */
  economicCode: string;
  /** شماره ثبت (company, optional). */
  regNo: string;
  postal: string;
  address: string;
  phone: string;
};
export const EMPTY_LEGAL: LegalInfo = { kind: "company", name: "", nationalId: "", economicCode: "", regNo: "", postal: "", address: "", phone: "" };

const digits = (s: string) => String(s ?? "").replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/\D/g, "");

/** Iranian national code (کد ملی) checksum. */
export function validMelliCode(v: string) {
  const d = digits(v);
  if (!/^\d{10}$/.test(d) || /^(\d)\1{9}$/.test(d)) return false;
  const sum = [...d.slice(0, 9)].reduce((s, c, i) => s + Number(c) * (10 - i), 0) % 11;
  const check = Number(d[9]);
  return sum < 2 ? check === sum : check === 11 - sum;
}

/** Legal-entity national id (شناسه ملی): 11 digits. */
export const validCompanyId = (v: string) => /^\d{11}$/.test(digits(v));

/** Cleans legal details. Returns the field that is wrong, if any. */
export function cleanLegal(x: Partial<LegalInfo> | null | undefined): { info: LegalInfo } | { error: keyof LegalInfo } {
  const kind: LegalKind = x?.kind === "person" ? "person" : "company";
  const t = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
  const info: LegalInfo = {
    kind, name: t(x?.name, 120), nationalId: digits(t(x?.nationalId)), economicCode: digits(t(x?.economicCode)),
    regNo: digits(t(x?.regNo)), postal: digits(t(x?.postal)), address: t(x?.address, 300), phone: digits(t(x?.phone)),
  };
  if (info.name.length < 3) return { error: "name" };
  if (kind === "company" ? !validCompanyId(info.nationalId) : !validMelliCode(info.nationalId)) return { error: "nationalId" };
  if (info.economicCode && !/^\d{11,14}$/.test(info.economicCode)) return { error: "economicCode" };
  if (!/^\d{10}$/.test(info.postal)) return { error: "postal" };
  if (info.address.length < 10) return { error: "address" };
  if (info.phone && !/^0\d{9,10}$/.test(info.phone)) return { error: "phone" };
  return { info };
}

export const LEGAL_ERRORS: Record<keyof LegalInfo, string> = {
  kind: "", name: "نام را کامل بنویس",
  nationalId: "شناسه ملی / کد ملی درست نیست", economicCode: "کد اقتصادی ۱۱ تا ۱۴ رقم است",
  regNo: "", postal: "کد پستی ۱۰ رقم است", address: "نشانی را کامل بنویس", phone: "تلفن را با کد شهر بنویس",
};

// ----- «دنگ» (split payment) -----
export type SplitStatus = "open" | "full" | "closed" | "canceled";
export type SplitView = {
  code: string; productId: string; plan: string; type: string; seats: number; unit: number;
  status: SplitStatus; expired: boolean; expiresAt: number; createdAt: number;
  owner: string; isOwner: boolean; paid: number;
  members: { name: string; paid: boolean; me: boolean; owner: boolean }[];
  /** The viewer's own order in this group, if any. */
  mine: { code: string; status: string } | null;
};
/** Hours a group stays open for new members. */
export const SPLIT_HOURS = 72;
