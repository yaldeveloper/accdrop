"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ALL_PRODUCTS, currentDrop, planKeys, productById, sellable, type Selection } from "@/lib/catalog";
import { comboById, comboLines, pricedLines } from "@/lib/combos";

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
  /** Returns false when the same line is already in the cart. */
  addLine: (sel: Selection) => boolean;
  /** Adds every item of a combo pack (lib/combos.ts). Returns false when the pack is already in the cart. */
  addCombo: (id: string) => boolean;
  /** Removes a line; a line of a combo pack removes the whole pack. */
  removeLine: (i: number) => void;
  /** Changes one cart line (e.g. adds an add-on at checkout) and re-prices it. */
  updateLine: (i: number, patch: Partial<Selection>) => void;
  clearCart: () => void;
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
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]") as CartLine[];
      // Drop lines whose product or option no longer exists, and re-price the rest.
      setCart(pricedLines(saved.filter((l) => ALL_PRODUCTS.some((p) => p.id === l.id && !p.hidden && sellable(p, l)))));
    } catch { /* storage unavailable */ }
  }, []);
  // Every change re-prices the cart: a combo pack is discounted only while all of its items are in it.
  const persist = (lines: Selection[]) => {
    const next = pricedLines(lines);
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
      const drop = currentDrop();
      const isDrop = drop?.productId === id;
      const plan = isDrop ? drop!.plan : planKeys(p)[0];
      const type = isDrop ? drop!.type : (Object.keys(p.plans[plan] ?? {})[0] as Selection["type"]);
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
    addSelection: () => { if (selection) persist([...cart, selection]); },
    addLine: (sel) => {
      const same = (l: Selection) => l.id === sel.id && l.plan === sel.plan && l.type === sel.type && (l.seats ?? 1) === (sel.seats ?? 1) && (l.ip ?? "") === (sel.ip ?? "");
      if (cart.some(same)) return false;
      persist([...cart, sel]);
      return true;
    },
    addCombo: (id) => {
      const c = comboById(id);
      if (!c || cart.some((l) => l.combo === id)) return false;
      // A pack item already in the cart on its own joins the pack instead of being bought twice.
      const rest = cart.filter((l) => !(!l.combo && c.items.some((it) => it.id === l.id && it.plan === l.plan && it.type === l.type && (l.seats ?? 1) === 1)));
      persist([...rest, ...comboLines(c)]);
      return true;
    },
    removeLine: (i) => {
      const pack = cart[i]?.combo;
      persist(cart.filter((l, j) => j !== i && !(pack && l.combo === pack)));
    },
    updateLine: (i, patch) => persist(cart.map((l, j) => (j === i ? { ...l, ...patch } : l))),
    clearCart: () => persist([]),
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
