// Cryptorefills gift cards: each order is paid on-chain from our own USDT wallet (BNB Smart Chain) and the code is read back
// from the order once it is delivered. Docs: https://www.cryptorefills.com/en/api-docs/developers
//
// Environment (set in Vercel, never in code):
//   CRYPTOREFILLS_PARTNER_ID  Partner ID from the Cryptorefills account page (X-Cr-Application).
//   CR_WALLET_KEY             Private key of a dedicated hot wallet that holds USDT (BEP20) and a little BNB for gas.
//                             Keep only what a few days of sales need in it.
//   CR_EMAIL                  Inbox the codes are also emailed to (yours). Defaults to orders@accdrop.ir.
//   CR_RPC_URL                BNB Smart Chain RPC (optional, defaults to Binance's public node).
//   CR_MAX_ORDER_USDT         Refuse to auto-pay a single order above this (default 150).
// Without CRYPTOREFILLS_PARTNER_ID and CR_WALLET_KEY nothing is bought; paid lines wait for the admin.
import { Contract, JsonRpcProvider, Wallet, formatEther, formatUnits, parseUnits } from "ethers";
import type { Product } from "@/lib/catalog";
import { db } from "./db";

const API = "https://api.cryptorefills.com";
const NETWORK = "Binance Smart Chain";
/** USDT (BEP20) on BNB Smart Chain; 18 decimals. */
const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
const ERC20 = ["function transfer(address to, uint256 value) returns (bool)", "function balanceOf(address) view returns (uint256)"];

export const crConfigured = () => !!process.env.CRYPTOREFILLS_PARTNER_ID && !!process.env.CR_WALLET_KEY;
const email = () => process.env.CR_EMAIL || "orders@accdrop.ir";
const maxOrder = () => Number(process.env.CR_MAX_ORDER_USDT) || 150;
const provider = () => new JsonRpcProvider(process.env.CR_RPC_URL || "https://bsc-dataseed.binance.org", 56);
const wallet = () => new Wallet(process.env.CR_WALLET_KEY!, provider());

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(API + path, {
      ...init, cache: "no-store", signal: ctl.signal,
      headers: { "content-type": "application/json", "x-cr-application": process.env.CRYPTOREFILLS_PARTNER_ID ?? "", "x-cr-version": "accdrop-1", "user-agent": "accdrop-server/1.0" },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(`cryptorefills ${path} ${r.status}: ${JSON.stringify(j).slice(0, 200)}`), { status: r.status });
    return j as T;
  } finally { clearTimeout(t); }
}

type Deliverable = { pin_code?: string | null; pin_serial?: string | null; security_code?: string | null; failure_reason?: string | null };
type CrOrder = {
  order_id: string; wallet_address?: string; coin?: string; coin_amount?: string; network?: string;
  order_state: string; payment_state: string; deliveries?: { delivery_state: string; deliverable: Deliverable }[];
};

const deliveriesFor = (opt: NonNullable<Product["cr"]>[string], n: number) => Array.from({ length: n }, () => ({
  beneficiary_account: email(), brand_name: opt.brand, country_code: "US",
  ...(opt.denom ? { denomination: opt.denom } : { denomination: "range", product_value: opt.value }),
}));
const payment = { type: "via", payment_via: "USER_WALLET", coin: "USDT", network: NETWORK };

/** One code per delivery: «code», plus serial / security code when the brand has them. */
const codeOf = (d: Deliverable) => [d.pin_code, d.pin_serial && `Serial: ${d.pin_serial}`, d.security_code && `Security: ${d.security_code}`].filter(Boolean).join(" | ");

/** Hot wallet address and balances, for the admin page. */
export async function crWallet(): Promise<{ address: string; usdt: number; bnb: number } | null> {
  if (!crConfigured()) return null;
  const w = wallet();
  const usdt = new Contract(USDT_BSC, ERC20, w.provider);
  const [u, b] = await Promise.all([usdt.balanceOf(w.address) as Promise<bigint>, w.provider!.getBalance(w.address)]);
  return { address: w.address, usdt: Number(formatUnits(u, 18)), bnb: Number(formatEther(b)) };
}

/**
 * Advances one paid order line that sells a Cryptorefills card and returns its codes once delivered (else null).
 * State lives in order_lines.supply_ref: «CR-NEW» (claimed), «CR-<order id>» (created), «CR-<order id>|<tx>» (paid),
 * «CR-ERR: …» (needs the admin). Safe to call repeatedly: an order is created and paid at most once per line.
 */
export async function crSupplyLine(lineId: number, p: Product, plan: string, quantity: number, siteUrl: string): Promise<string[] | null> {
  const opt = p.cr?.[plan];
  if (!opt || !crConfigured()) return null;
  const sql = await db();
  const [row] = await sql`select supply_ref, order_code from order_lines where id = ${lineId}`;
  let ref: string | null = row?.supply_ref ?? null;
  if (ref?.startsWith("CR-ERR") || ref === "CR-NEW") return null;
  const fail = async (msg: string) => { await sql`update order_lines set supply_ref = ${"CR-ERR: " + msg.slice(0, 200)} where id = ${lineId}`; return null; };

  if (!ref) {
    // Claim the line first so two concurrent calls can never buy twice.
    const claimed = await sql`update order_lines set supply_ref = 'CR-NEW' where id = ${lineId} and supply_ref is null returning id`;
    if (!claimed.length) return null;
    try {
      const body = { user: { email: email(), has_accepted_newsletter: false }, payment, deliveries: deliveriesFor(opt, quantity), lang: "en",
        state_transition_notification_url: `${siteUrl}/api/supplier/cr?order=${encodeURIComponent(row.order_code)}` };
      const v = await call<{ coin_amount: string; problems?: { problem: string }[] }>("/v5/orders/validations", { method: "POST", body: JSON.stringify(body) });
      if (v.problems?.length) return fail(v.problems.map((x) => x.problem).join(","));
      const amount = Number(v.coin_amount);
      // Never pay far above what the price list expects, nor above the per-order cap.
      if (!(amount > 0) || amount > opt.cost * quantity * 1.1 + 0.5 || amount > maxOrder()) return fail(`price ${amount} USDT, expected ~${(opt.cost * quantity).toFixed(2)}`);
      const o = await call<CrOrder>("/v5/orders", { method: "POST", body: JSON.stringify(body) });
      if (!o.order_id || !o.wallet_address || !o.coin_amount) return fail("no payment address");
      ref = `CR-${o.order_id}`;
      await sql`update order_lines set supply_ref = ${ref}, supply_cost = ${Number(o.coin_amount)} where id = ${lineId}`;
      if (Number(o.coin_amount) > amount + 0.05) return fail(`order ${o.order_id} asks ${o.coin_amount}, validated ${amount}`);
      const usdt = new Contract(USDT_BSC, ERC20, wallet());
      const tx = await usdt.transfer(o.wallet_address, parseUnits(o.coin_amount, 18));
      ref = `${ref}|${tx.hash}`;
      await sql`update order_lines set supply_ref = ${ref} where id = ${lineId}`;
    } catch (e) {
      console.error(e);
      // If the order was created but not paid, the admin can pay it by hand from the Cryptorefills order id.
      return fail(`${ref && ref !== "CR-NEW" ? ref + " " : ""}${String((e as Error).message)}`);
    }
  }

  const orderId = ref.slice(3).split("|")[0];
  try {
    const o = await call<CrOrder>(`/v5/orders/${orderId}`);
    if (["Expired", "Canceled", "PaymentFailed", "Refunded"].includes(o.order_state)) return fail(`${ref} ${o.order_state}`);
    const codes = (o.deliveries ?? []).map((d) => codeOf(d.deliverable)).filter(Boolean);
    if (o.order_state === "Done" && codes.length >= quantity) return codes;
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
