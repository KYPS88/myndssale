"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { track } from "./analytics";

export type CartLine = {
  variantId: number;
  qty: number;
  sku: string;
  slug: string;
  name: string;
  color: string;
  size: string;
  price: number;
  image: string | null;
  stock: number;
};

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "mynds_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.variantId === line.variantId);
      if (found) {
        return prev.map((l) =>
          l.variantId === line.variantId ? { ...l, ...line, qty: Math.min(l.qty + qty, line.stock, 99) } : l,
        );
      }
      return [...prev, { ...line, qty: Math.min(qty, line.stock, 99) }];
    });
    track("add_to_cart", { value: line.price * qty, items: [{ item_id: line.sku, item_name: line.name, price: line.price, quantity: qty }] });
    setDrawerOpen(true);
  }, []);

  const setQty = useCallback((variantId: number, qty: number) => {
    setLines((prev) =>
      prev.map((l) => (l.variantId === variantId ? { ...l, qty: Math.max(1, Math.min(qty, l.stock || 1, 99)) } : l)),
    );
  }, []);

  const remove = useCallback((variantId: number) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)), []);
  const clear = useCallback(() => setLines([]), []);
  const replace = useCallback((next: CartLine[]) => setLines(next), []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
      add,
      setQty,
      remove,
      replace,
      clear,
      drawerOpen,
      setDrawerOpen,
    }),
    [lines, ready, add, setQty, remove, replace, clear, drawerOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
