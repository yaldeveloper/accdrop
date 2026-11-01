const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export const fa = (n: number | string) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export const money = (n: number) => fa(Math.round(n).toLocaleString("en-US")).replace(/,/g, "٬");

export const duration = (m: string | number) =>
  Number(m) === 12 ? "یک ساله" : Number(m) === 1 ? "یک ماهه" : `${fa(m)} ماهه`;

/** Club points: one point per 100,000 Toman. */
export const clubPoints = (toman: number) => Math.floor(toman / 100000);

export const pad2 = (n: number) => fa(String(n).padStart(2, "0"));
