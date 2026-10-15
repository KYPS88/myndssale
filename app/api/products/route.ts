import { NextResponse } from "next/server";
import { getAllProducts, sellable, toCard } from "@/lib/products";

/** ใช้ในหน้า wishlist: ?slugs=a,b,c */
export async function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "").split(",").filter(Boolean).slice(0, 100);
  const items = getAllProducts()
    .filter((p) => slugs.includes(p.slug) && sellable(p).length)
    .map(toCard);
  return NextResponse.json({ items });
}
