import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { lookupOrder } from "@/lib/orders";
import { orderToken } from "@/lib/order-token";

export const metadata: Metadata = { title: "ติดตามคำสั่งซื้อ" };

async function find(formData: FormData) {
  "use server";
  const no = String(formData.get("orderNo") ?? "").trim().toUpperCase();
  const phone = String(formData.get("phone") ?? "");
  const o = lookupOrder(no, phone);
  if (!o) redirect("/track?error=1");
  redirect(`/order/${o.order_no}?t=${orderToken(o.order_no)}`);
}

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="container-x max-w-md py-16">
      <h1 className="text-2xl font-semibold">ติดตามคำสั่งซื้อ</h1>
      <p className="mt-1 text-sm text-muted">กรอกหมายเลขคำสั่งซื้อและเบอร์โทรที่ใช้สั่งซื้อ</p>
      <form action={find} className="mt-6 space-y-4">
        <div><label className="label" htmlFor="orderNo">หมายเลขคำสั่งซื้อ</label><input id="orderNo" name="orderNo" className="input" placeholder="MY2610121234" required /></div>
        <div><label className="label" htmlFor="phone">เบอร์โทรศัพท์</label><input id="phone" name="phone" className="input" inputMode="tel" required /></div>
        {error && <p className="text-sm text-sale">ไม่พบคำสั่งซื้อ กรุณาตรวจสอบข้อมูลอีกครั้ง</p>}
        <button className="btn-primary w-full">ค้นหา</button>
      </form>
    </div>
  );
}
