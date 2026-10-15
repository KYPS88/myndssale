"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWishlist } from "@/components/Wishlist";
import { Price } from "@/components/ProductCard";
import type { ProductCard as Card } from "@/lib/products";
import { Img } from "@/components/Img";

export default function WishlistPage() {
  const { list, toggle } = useWishlist();
  const [items, setItems] = useState<Card[] | null>(null);
  useEffect(() => {
    if (!list.length) {
      setItems([]);
      return;
    }
    fetch(`/api/products?slugs=${encodeURIComponent(list.join(","))}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [list]);

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-semibold">สินค้าที่ชอบ</h1>
      <p className="mt-1 text-sm text-muted">บันทึกไว้ในเครื่องนี้ ไม่ต้องสมัครสมาชิก</p>
      {items && items.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted">ยังไม่มีสินค้าที่บันทึกไว้ กด ♡ ที่สินค้าเพื่อบันทึก</p>
          <Link href="/products" className="btn-primary mt-6">เลือกดูสินค้า</Link>
        </div>
      )}
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {items?.map((p) => (
          <div key={p.slug}>
            <Link href={`/products/${p.slug}`} className="block aspect-[4/5] overflow-hidden rounded-xl bg-soft">
              <Img src={p.image} alt={p.name} className="h-full w-full object-cover" />
            </Link>
            <p className="mt-2 line-clamp-2 text-sm">{p.name}</p>
            <Price price={p.price} compareAt={p.compareAt} className="text-sm" />
            <button onClick={() => toggle(p.slug)} className="mt-1 text-xs text-muted underline">ลบออก</button>
          </div>
        ))}
      </div>
    </div>
  );
}
