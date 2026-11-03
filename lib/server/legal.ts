import { cleanLegal, type LegalInfo } from "@/lib/billing";
import { db } from "./db";

/** Saved buyer details for official invoices. */
export async function getLegal(mobile: string): Promise<LegalInfo | null> {
  const sql = await db();
  const [r] = await sql`select data from legal_profiles where mobile = ${mobile}`;
  return (r?.data as LegalInfo) ?? null;
}

export async function saveLegal(mobile: string, input: unknown) {
  const c = cleanLegal(input as Partial<LegalInfo>);
  if ("error" in c) return c;
  const sql = await db();
  await sql`insert into legal_profiles (mobile, data) values (${mobile}, ${sql.json(c.info)})
    on conflict (mobile) do update set data = excluded.data, updated_at = now()`;
  return c;
}

/** Seller block printed on invoices (set these in the environment). */
export const seller = () => ({
  name: process.env.SELLER_NAME || "اک‌دراپ",
  nationalId: process.env.SELLER_NATIONAL_ID || "",
  economicCode: process.env.SELLER_ECONOMIC_CODE || "",
  regNo: process.env.SELLER_REG_NO || "",
  postal: process.env.SELLER_POSTAL || "",
  address: process.env.SELLER_ADDRESS || "",
  phone: process.env.SELLER_PHONE || "",
});

/** VAT percent included in prices (ارزش افزوده). */
export const vatPercent = () => {
  const v = Number(process.env.VAT_PERCENT);
  return Number.isFinite(v) && v >= 0 && v <= 30 ? v : 10;
};
