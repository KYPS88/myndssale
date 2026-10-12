import { NextResponse } from "next/server";
import { CheckoutError, createOrder, validateCheckout } from "@/lib/orders";
import { orderToken } from "@/lib/order-token";
import { notifyNewOrder } from "@/lib/notify";

export async function POST(req: Request) {
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
