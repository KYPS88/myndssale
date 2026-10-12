import { createHmac, timingSafeEqual } from "node:crypto";

// ลิงก์หน้าสถานะออเดอร์มี token กันคนเดาเลขออเดอร์ของคนอื่น
function key(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "mynds-dev-secret";
}

export function orderToken(orderNo: string): string {
  return createHmac("sha256", key()).update(`order:${orderNo}`).digest("base64url").slice(0, 24);
}

export function verifyOrderToken(orderNo: string, token: string | undefined): boolean {
  if (!token) return false;
  const a = Buffer.from(orderToken(orderNo));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
