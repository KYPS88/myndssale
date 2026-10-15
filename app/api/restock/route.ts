import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { variantId?: number; contact?: string };
  const contact = String(body.contact ?? "").trim().slice(0, 160);
  const variantId = Number(body.variantId);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^0\d{8,9}$/.test(contact.replace(/\D/g, ""));
  if (!Number.isInteger(variantId) || !valid) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const db = getDb();
  if (!db.prepare("SELECT 1 FROM variants WHERE id = ?").get(variantId)) {
    return NextResponse.json({ error: "ไม่พบสินค้า" }, { status: 404 });
  }
  const dup = db.prepare("SELECT 1 FROM restock_requests WHERE variant_id = ? AND contact = ? AND notified = 0").get(variantId, contact);
  if (!dup) db.prepare("INSERT INTO restock_requests (variant_id, contact) VALUES (?, ?)").run(variantId, contact);
  return NextResponse.json({ ok: true });
}
