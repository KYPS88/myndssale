import type { Metadata } from "next";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "ตะกร้าสินค้า", robots: { index: false } };

export default function CartPage() {
  return <CartView />;
}
