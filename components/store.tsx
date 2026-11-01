"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CURRENT_DROP, planKeys, priceOf, productById, type Selection } from "@/lib/catalog";

export type CartLine = Selection & { price: number };
export type SheetView = "product" | "cart" | "checkout" | "done" | null;

type Store = {
  cart: CartLine[];
  total: number;
  selection: Selection | null;
  view: SheetView;
  searchOpen: boolean;
  toast: string | null;
  orderCode: string | null;
  openProduct: (id: string) => void;
  select: (patch: Partial<Selection>) => void;
  addSelection: () => void;
  /** Add an explicit selection (used by product pages). */
  addLine: (sel: Selection) => void;
  removeLine: (i: number) => void;
  setView: (v: SheetView) => void;
  completeOrder: () => void;
  openSearch: () => void;
  close: () => void;
  notify: (msg: string) => void;
};

const Ctx = createContext<Store | null>(null);
const KEY = "accdrop-cart";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [view, setViewState] = useState<SheetView>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* storage unavailable */ }
  }, []);
  const persist = (next: CartLine[]) => {
    setCart(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const close = useCallback(() => { setViewState(null); setSearchOpen(false); }, []);

  useEffect(() => {
    document.body.style.overflow = view ? "hidden" : "";
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA/.test((document.activeElement as HTMLElement | null)?.tagName ?? "");
      if (e.key === "/" && !typing) { e.preventDefault(); setViewState(null); setSearchOpen(true); }
      if (e.key === "Escape") close();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [close]);

  const value = useMemo<Store>(() => ({
    cart,
    total: cart.reduce((s, l) => s + l.price, 0),
    selection, view, searchOpen, toast, orderCode,
    openProduct: (id) => {
      const p = productById(id);
      const isDrop = CURRENT_DROP.productId === id;
      const plan = isDrop ? CURRENT_DROP.plan : planKeys(p)[0];
      const type = isDrop ? CURRENT_DROP.type : (Object.keys(p.plans[plan] ?? {})[0] as Selection["type"]);
      setSelection({ id, plan, type });
      setSearchOpen(false);
      setViewState("product");
    },
    select: (patch) => setSelection((s) => {
      if (!s) return s;
      const next = { ...s, ...patch };
      const offers = productById(next.id).plans[next.plan] ?? {};
      if (!offers[next.type]) next.type = Object.keys(offers)[0] as Selection["type"];
      return next;
    }),
    addSelection: () => { if (selection) persist([...cart, { ...selection, price: priceOf(selection).price }]); },
    addLine: (sel) => persist([...cart, { ...sel, price: priceOf(sel).price }]),
    removeLine: (i) => persist(cart.filter((_, j) => j !== i)),
    setView: (v) => setViewState(v),
    completeOrder: () => {
      // Placeholder for the payment gateway (e.g. Zarinpal) redirect + server-side order creation.
      setOrderCode(`AD-${40000 + Math.floor(Math.random() * 9999)}`);
      persist([]);
      setViewState("done");
    },
    openSearch: () => { setViewState(null); setSearchOpen(true); },
    close, notify,
  }), [cart, selection, view, searchOpen, toast, orderCode, close, notify]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}
