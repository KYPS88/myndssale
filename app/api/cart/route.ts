import { NextResponse } from "next/server";
import { getDb, getSettings } from "@/lib/db";
import { findCoupon, loadCartVariants } from "@/lib/orders";
import { computeTotals, rulesFromSettings } from "@/lib/pricing";

/** ตรวจราคา/สต็อกล่าสุดของตะกร้า และคำนวณยอด (ใช้ในหน้าตะกร้าและ checkout) */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    items?: { variantId: number; qty: number }[];
    couponCode?: string;
    paymentMethod?: string;
  };
  const items = (Array.isArray(body.items) ? body.items : [])
    .slice(0, 50)
    .map((i) => ({ variantId: Number(i.variantId), qty: Math.max(1, Math.min(99, Math.floor(Number(i.qty) || 1))) }))
    .filter((i) => Number.isInteger(i.variantId) && i.variantId > 0);
  const db = getDb();
  const variants = loadCartVariants(db, items.map((i) => i.variantId));
  const lines = items.map((i) => {
    const v = variants.get(i.variantId);
    const available = !!v && v.status === "active" && v.price > 0;
    return {
      variantId: i.variantId,
      qty: available ? Math.min(i.qty, Math.max(v!.stock, 0)) : 0,
      requested: i.qty,
      available: available && v!.stock > 0,
      price: v?.price ?? 0,
      stock: v?.stock ?? 0,
      name: v?.name,
      color: v?.color,
      size: v?.size,
      image: v?.image,
      sku: v?.sku,
      slug: v?.slug,
    };
  });
  const settings = getSettings(db);
  const code = body.couponCode?.trim().slice(0, 40);
  const totals = computeTotals(
    lines.filter((l) => l.available),
    rulesFromSettings(settings),
    { coupon: code ? findCoupon(db, code) : undefined, cod: body.paymentMethod === "cod" },
  );
  return NextResponse.json({
    lines,
    totals,
    payment: {
      cod: settings.cod_enabled === "1",
      card: settings.card_enabled === "1",
      codFee: Number(settings.cod_fee) || 0,
    },
    freeShippingMin: Number(settings.free_shipping_min) || 0,
  });
}
