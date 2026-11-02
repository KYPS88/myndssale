import type { Metadata } from "next";
import { CartView } from "./CartView";
import { getSettings } from "@/lib/db";
import { LineOrderNotice } from "@/components/LineOrderNotice";

export const metadata: Metadata = { title: "ตะกร้าสินค้า", robots: { index: false } };

export default function CartPage() {
  if (getSettings().web_order_enabled !== "1") return <LineOrderNotice />;
  return <CartView />;
}
