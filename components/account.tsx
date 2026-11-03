"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizeMobile, type Order, type ResellerApp, type User } from "@/lib/account";
import type { DeliveryType } from "@/lib/catalog";
import type { LegalInfo, PayMethod } from "@/lib/billing";

export type Me = User & { isAdmin: boolean };
export type PlaceLine = { id: string; plan: string; type: DeliveryType; email?: string; username?: string; seats?: number; ip?: string; members?: string[] };
export type ApiError = { error: string; index?: number; wait?: number; field?: string };

type Account = {
  ready: boolean;
  user: Me | null;
  orders: Order[];
  now: number;
  /** While no SMS panel or gateway is connected the site says so (fixed login code, test gateway). */
  demo: { login: boolean; gateway: boolean };
  requestOtp: (mobile: string) => Promise<{ ok: boolean; error?: string; wait?: number }>;
  verifyOtp: (mobile: string, code: string) => Promise<{ ok: boolean; isNew: boolean; error?: string }>;
  updateProfile: (patch: Partial<Pick<User, "name" | "email">>) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Creates the order on the server and returns where to send the customer to pay. */
  placeOrder: (lines: PlaceLine[], discountCode: string, method?: PayMethod, invoice?: LegalInfo | null) => Promise<{ code: string; payUrl: string } | ApiError>;
  refreshOrders: () => Promise<void>;
  reseller: ResellerApp | null;
  applyReseller: (a: Omit<ResellerApp, "mobile" | "createdAt" | "status">) => Promise<boolean>;
};

const Ctx = createContext<Account | null>(null);

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T & Partial<ApiError>> {
  try {
    const r = await fetch(path, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body ? { "content-type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    return (await r.json().catch(() => ({ error: "server_error" }))) as T & Partial<ApiError>;
  } catch {
    return { error: "network" } as T & Partial<ApiError>;
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reseller, setReseller] = useState<ResellerApp | null>(null);
  const [demo, setDemo] = useState({ login: false, gateway: false });
  const [now, setNow] = useState(() => Date.now());

  const loadMine = useCallback(async () => {
    const [o, r] = await Promise.all([api<{ orders: Order[] }>("/api/orders"), api<{ reseller: ResellerApp | null }>("/api/reseller")]);
    setOrders(o.orders ?? []);
    setReseller(r.reseller ?? null);
  }, []);

  const loadMe = useCallback(async () => {
    const r = await api<{ user: Me | null; demo: { login: boolean; gateway: boolean } }>("/api/auth/me");
    setUser(r.user ?? null);
    if (r.demo) setDemo(r.demo);
    if (r.user) await loadMine(); else { setOrders([]); setReseller(null); }
    return r.user ?? null;
  }, [loadMine]);

  useEffect(() => {
    loadMe().finally(() => setReady(true));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [loadMe]);

  const value = useMemo<Account>(() => ({
    ready, user, orders, now, demo, reseller,
    requestOtp: async (mobile) => {
      const r = await api<{ ok: boolean }>("/api/auth/otp", { body: { mobile: normalizeMobile(mobile) } });
      return { ok: !!r.ok, error: r.error, wait: r.wait };
    },
    verifyOtp: async (mobile, code) => {
      const r = await api<{ ok: boolean; isNew: boolean }>("/api/auth/verify", { body: { mobile: normalizeMobile(mobile), code } });
      if (r.ok) await loadMe();
      return { ok: !!r.ok, isNew: !!r.isNew, error: r.error };
    },
    updateProfile: async (patch) => {
      const r = await api<{ user: Me }>("/api/auth/me", { method: "PATCH", body: patch });
      if (r.user) setUser(r.user);
      return !!r.user;
    },
    logout: async () => { await api("/api/auth/logout", { method: "POST", body: {} }); setUser(null); setOrders([]); setReseller(null); },
    placeOrder: async (lines, discount, method = "card", invoice = null) => {
      const r = await api<{ code: string; payUrl: string }>("/api/orders", { body: { lines, discount, method, invoice } });
      return r.error || !r.code ? { error: r.error ?? "server_error", index: r.index, field: r.field } : { code: r.code, payUrl: r.payUrl };
    },
    refreshOrders: loadMine,
    applyReseller: async (a) => {
      const r = await api<{ reseller: ResellerApp }>("/api/reseller", { body: a });
      if (r.reseller) setReseller(r.reseller);
      return !!r.reseller;
    },
  }), [ready, user, orders, now, demo, reseller, loadMe, loadMine]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount() {
  const a = useContext(Ctx);
  if (!a) throw new Error("useAccount must be used inside <AccountProvider>");
  return a;
}

/** One order, fetched from the server and refreshed every few seconds until it is complete. */
export function useOrder(code: string) {
  const { user, ready } = useAccount();
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const load = useCallback(async () => {
    const r = await api<{ order: Order }>(`/api/orders/${encodeURIComponent(code)}`);
    if (r.order) { setOrder(r.order); setState("ok"); } else setState("missing");
    return r.order;
  }, [code]);
  useEffect(() => {
    if (!ready) return;
    if (!user) { setState("missing"); return; }
    let stop = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const o = await load();
      if (!stop && o && (o.status === "paid" || o.status === "activating")) t = setTimeout(tick, 5000);
    };
    tick();
    return () => { stop = true; clearTimeout(t); };
  }, [ready, user, load]);
  return { order, state, reload: load };
}
