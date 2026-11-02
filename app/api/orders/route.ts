import { NextResponse } from "next/server";
import { CheckoutError, createOrder, validateCheckout } from "@/lib/orders";
import { orderToken } from "@/lib/order-token";
import { notifyNewOrder } from "@/lib/notify";
import { getSettings } from "@/lib/db";
import { site } from "@/lib/site";

export async function POST(req: Request) {
  if (getSettings().web_order_enabled !== "1") {
    return NextResponse.json({ error: `ตอนนี้รับคำสั่งซื้อทาง LINE ${site.contact.lineId} เท่านั้น` }, { status: 403 });
  }
  try {
    const input = validateCheckout(await req.json().catch(() => null));
    const order = createOrder(input);
    void notifyNewOrder({
      orderNo: order.orderNo,
      total: order.total,
      paymentMethod: input.paymentMethod,
      name: input.customer.name,
      itemCount: input.items.reduce((s, i) => s + i.qty, 0),
    });
    return NextResponse.json({ orderNo: order.orderNo, token: orderToken(order.orderNo), total: order.total });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message, field: e.field }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
