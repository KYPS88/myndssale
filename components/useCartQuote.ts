"use client";

import { useEffect, useState } from "react";
import { useCart, type CartLine } from "./CartProvider";

export type Quote = {
  lines: { variantId: number; qty: number; requested: number; available: boolean; price: number; stock: number; name?: string; color?: string; size?: string; image?: string | null; sku?: string; slug?: string }[];
  totals: { subtotal: number; discount: number; shipping: number; codFee: number; total: number; couponError: string | null };
  payment: { cod: boolean; card: boolean; codFee: number };
  freeShippingMin: number;
};

/** ดึงราคา/สต็อกล่าสุดจาก server แล้ว sync ตะกร้าในเครื่องให้ตรง */
export function useCartQuote(couponCode: string, paymentMethod?: string) {
  const { lines, ready, replace } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(lines.map((l) => [l.variantId, l.qty])) + couponCode + (paymentMethod ?? "");

  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })), couponCode, paymentMethod }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((q: Quote) => {
        setQuote(q);
        // อัปเดตราคา/สต็อกในตะกร้า และปรับจำนวนลงถ้าสต็อกไม่พอ
        const next: CartLine[] = lines.map((l) => {
          const s = q.lines.find((x) => x.variantId === l.variantId);
          if (!s || !s.available) return { ...l, stock: 0 };
          return { ...l, price: s.price, stock: s.stock, qty: Math.min(l.qty, s.stock) };
        });
        if (JSON.stringify(next) !== JSON.stringify(lines)) replace(next);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return { quote, loading };
}
