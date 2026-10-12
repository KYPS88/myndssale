import { formatBaht } from "./site.ts";
import { PAYMENT_LABEL } from "./orders.ts";

/**
 * แจ้งทีมงานเมื่อมีออเดอร์ใหม่ผ่าน LINE Messaging API (push message)
 * ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN และ LINE_NOTIFY_TO (userId/groupId) — ถ้าไม่ได้ตั้งจะข้ามไปเงียบ ๆ
 */
export async function notifyNewOrder(o: { orderNo: string; total: number; paymentMethod: string; name: string; itemCount: number }) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_NOTIFY_TO;
  if (!token || !to) return;
  const text =
    `🛒 ออเดอร์ใหม่ ${o.orderNo}\n` +
    `ลูกค้า: ${o.name}\n` +
    `จำนวน: ${o.itemCount} ชิ้น\n` +
    `ยอดรวม: ${formatBaht(o.total)}\n` +
    `ชำระโดย: ${PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}`;
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("LINE notify failed", e);
  }
}
