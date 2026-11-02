const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export const fa = (n: number | string) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export const money = (n: number) => fa(Math.round(n).toLocaleString("en-US")).replace(/,/g, "٬");

export const duration = (m: string | number) =>
  Number(m) === 12 ? "یک ساله" : Number(m) === 1 ? "یک ماهه" : `${fa(m)} ماهه`;

/** Club points: one point per 100,000 Toman. */
export const clubPoints = (toman: number) => Math.floor(toman / 100000);

export const pad2 = (n: number) => fa(String(n).padStart(2, "0"));

/** Solar Hijri date/time, e.g. «۱۰ آبان ۱۴۰۵، ۱۴:۳۰». */
export const faDate = (t: number, withTime = true) =>
  new Intl.DateTimeFormat("fa-IR", withTime ? { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "long", year: "numeric" }).format(t);
