import { NextResponse } from "next/server";
import { searchSuggest } from "@/lib/products";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 100) ?? "";
  const items = searchSuggest(q).map((c) => ({ slug: c.slug, name: c.name, price: c.price, image: c.image, category: c.category }));
  return NextResponse.json({ items });
}
