"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DISCOUNTS, newOrderCode, normalizeMobile, type Order, type OrderLine, type User } from "@/lib/account";

type Account = {
  ready: boolean;
  user: User | null;
  orders: Order[];
  now: number;
  /** Step 1 of login: send an OTP. Demo: always succeeds. */
  requestOtp: (mobile: string) => Promise<void>;
  /** Step 2: verify. Returns whether the user is new (so the UI can ask for a name). */
  verifyOtp: (mobile: string, code: string) => Promise<{ ok: boolean; isNew: boolean }>;
  updateProfile: (patch: Partial<Pick<User, "name" | "email">>) => void;
  logout: () => void;
  placeOrder: (lines: OrderLine[], discountCode: string) => Order;
  orderByCode: (code: string) => Order | undefined;
};

const Ctx = createContext<Account | null>(null);
const K_USERS = "accdrop-users", K_SESSION = "accdrop-session", K_ORDERS = "accdrop-orders";

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || "") as T; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export function AccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const users = read<Record<string, User>>(K_USERS, {});
    const session = read<string | null>(K_SESSION, null);
    setUser(session ? users[session] ?? null : null);
    setAllOrders(read<Order[]>(K_ORDERS, []));
    setReady(true);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const saveUser = (u: User) => {
    const users = read<Record<string, User>>(K_USERS, {});
    users[u.mobile] = u;
    write(K_USERS, users);
    setUser(u);
  };

  const requestOtp = useCallback(async () => { await new Promise((r) => setTimeout(r, 500)); }, []);

  const verifyOtp = useCallback(async (mobile: string, code: string) => {
    await new Promise((r) => setTimeout(r, 400));
    if (code !== "12345") return { ok: false, isNew: false };
    const m = normalizeMobile(mobile);
    const users = read<Record<string, User>>(K_USERS, {});
    const existing = users[m];
    const u = existing ?? { mobile: m, name: "", email: "", createdAt: Date.now() };
    saveUser(u);
    write(K_SESSION, m);
    return { ok: true, isNew: !existing || !existing.name };
  }, []);

  const value = useMemo<Account>(() => {
    const orders = user ? allOrders.filter((o) => o.mobile === user.mobile).sort((a, b) => b.createdAt - a.createdAt) : [];
    return {
      ready, user, orders, now, requestOtp, verifyOtp,
      updateProfile: (patch) => { if (user) saveUser({ ...user, ...patch }); },
      logout: () => { write(K_SESSION, null); setUser(null); },
      placeOrder: (lines, discountCode) => {
        const subtotal = lines.reduce((s, l) => s + l.price, 0);
        const rate = DISCOUNTS[discountCode.trim().toUpperCase()] ?? 0;
        const discount = Math.round((subtotal * rate) / 1000) * 1000;
        const o: Order = { code: newOrderCode(), createdAt: Date.now(), lines, subtotal, discount, total: subtotal - discount, mobile: user?.mobile ?? "" };
        const next = [o, ...allOrders];
        write(K_ORDERS, next);
        setAllOrders(next);
        if (user && !user.email) { const e = lines.find((l) => l.email)?.email; if (e) saveUser({ ...user, email: e }); }
        return o;
      },
      orderByCode: (code) => allOrders.find((o) => o.code === code),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, allOrders, now, requestOtp, verifyOtp]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount() {
  const a = useContext(Ctx);
  if (!a) throw new Error("useAccount must be used inside <AccountProvider>");
  return a;
}
