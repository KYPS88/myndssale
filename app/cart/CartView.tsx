"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useCartQuote } from "@/components/useCartQuote";
import { Summary } from "@/components/Summary";
import { QtyStepper } from "@/components/QtyStepper";
import { CloseIcon } from "@/components/icons";
import { Img } from "@/components/Img";

export function CartView() {
  const { lines, ready, setQty, remove } = useCart();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const { quote } = useCartQuote(applied);

  if (ready && lines.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-2xl font-semibold">ตะกร้าของคุณยังว่างอยู่</h1>
        <Link href="/products" className="btn-primary mt-6">เลือกซื้อสินค้า</Link>
      </div>
    );
  }
  const unavailable = lines.filter((l) => l.stock <= 0);

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-semibold">ตะกร้าสินค้า</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 py-5">
              <Img src={l.image} alt="" className="h-32 w-24 rounded-lg bg-soft object-cover" />
              <div className="flex flex-1 flex-col gap-1">
                <Link href={`/products/${l.slug}`} className="font-medium">{l.name}</Link>
                <span className="text-sm text-muted">สี {l.color} · ไซซ์ {l.size} · SKU {l.sku}</span>
                <span className="text-sm">฿{l.price.toLocaleString("th-TH")}</span>
                {l.stock <= 0 ? (
                  <span className="text-sm text-sale">สินค้าหมดแล้ว — กรุณาลบออกจากตะกร้า</span>
                ) : (
                  <div className="mt-auto flex items-center justify-between">
                    <QtyStepper value={l.qty} max={l.stock} onChange={(q) => setQty(l.variantId, q)} small />
                    <span className="font-semibold">฿{(l.price * l.qty).toLocaleString("th-TH")}</span>
                  </div>
                )}
              </div>
              <button onClick={() => remove(l.variantId)} className="self-start text-muted hover:text-ink" aria-label="ลบสินค้า"><CloseIcon /></button>
            </li>
          ))}
        </ul>
        <aside className="card h-fit space-y-5 p-6">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(coupon.trim().toUpperCase()); }}>
            <input className="input" placeholder="โค้ดส่วนลด" value={coupon} onChange={(e) => setCoupon(e.target.value)} aria-label="โค้ดส่วนลด" />
            <button className="btn-outline shrink-0">ใช้โค้ด</button>
          </form>
          {applied && quote?.totals.couponError && <p className="text-sm text-sale">{quote.totals.couponError}</p>}
          {applied && quote && !quote.totals.couponError && <p className="text-sm text-ice-dark">ใช้โค้ด {applied} แล้ว</p>}
          {quote && <Summary totals={quote.totals} freeShippingMin={quote.freeShippingMin} />}
          <Link
            href={`/checkout${applied && !quote?.totals.couponError ? `?coupon=${encodeURIComponent(applied)}` : ""}`}
            className={`btn-primary w-full py-3 ${unavailable.length ? "pointer-events-none opacity-50" : ""}`}
            aria-disabled={unavailable.length > 0}
          >
            ดำเนินการสั่งซื้อ
          </Link>
          <p className="text-center text-xs text-muted">สั่งซื้อได้ทันทีโดยไม่ต้องสมัครสมาชิก</p>
        </aside>
      </div>
    </div>
  );
}
