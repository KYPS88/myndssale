import type { Metadata } from "next";
import { CheckoutForm } from "./CheckoutForm";
import { getSettings } from "@/lib/db";
import { LineOrderNotice } from "@/components/LineOrderNotice";

export const metadata: Metadata = { title: "ชำระเงิน", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ coupon?: string }> }) {
  if (getSettings().web_order_enabled !== "1") return <LineOrderNotice />;
  const { coupon } = await searchParams;
  return <CheckoutForm initialCoupon={coupon?.slice(0, 40) ?? ""} />;
}
