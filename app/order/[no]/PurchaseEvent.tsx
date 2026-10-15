"use client";

import { useEffect } from "react";
import { track } from "@/components/analytics";

type Item = { item_id: string; item_name: string; price: number; quantity: number; item_variant?: string };

/** ยิง purchase ครั้งเดียวต่อออเดอร์ (กันรีเฟรชหน้าแล้วนับซ้ำ) */
export function PurchaseEvent(p: { orderNo: string; value: number; shipping: number; coupon: string | null; items: Item[] }) {
  useEffect(() => {
    const key = `mynds_purchase_${p.orderNo}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    track("purchase", { transaction_id: p.orderNo, value: p.value, shipping: p.shipping, coupon: p.coupon ?? undefined, items: p.items });
  }, [p]);
  return null;
}
