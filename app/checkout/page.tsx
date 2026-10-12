import type { Metadata } from "next";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "ชำระเงิน", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ coupon?: string }> }) {
  const { coupon } = await searchParams;
  return <CheckoutForm initialCoupon={coupon?.slice(0, 40) ?? ""} />;
}
