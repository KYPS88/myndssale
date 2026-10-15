"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { CloseIcon } from "./icons";
import { QtyStepper } from "./QtyStepper";
import { Img } from "@/components/Img";

export function CartDrawer({ freeShippingMin }: { freeShippingMin: number }) {
  const { lines, subtotal, drawerOpen, setDrawerOpen, setQty, remove } = useCart();
  if (!drawerOpen) return null;
  const remaining = freeShippingMin - subtotal;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="ตะกร้าสินค้า">
      <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-lg font-semibold">ตะกร้าสินค้า</h2>
          <button onClick={() => setDrawerOpen(false)} aria-label="ปิด"><CloseIcon /></button>
        </div>
        {freeShippingMin > 0 && lines.length > 0 && (
          <div className="bg-ice-light px-4 py-2 text-sm text-ice-dark">
            {remaining > 0 ? <>ช้อปเพิ่มอีก <b>฿{remaining.toLocaleString("th-TH")}</b> รับส่งฟรี</> : <>🎉 คุณได้รับสิทธิ์ส่งฟรี</>}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <p className="py-16 text-center text-muted">ยังไม่มีสินค้าในตะกร้า</p>
          ) : (
            <ul className="space-y-4">
              {lines.map((l) => (
                <li key={l.variantId} className="flex gap-3">
                  <Img src={l.image} alt="" className="h-24 w-20 rounded-lg bg-soft object-cover" />
                  <div className="flex flex-1 flex-col">
                    <Link href={`/products/${l.slug}`} onClick={() => setDrawerOpen(false)} className="line-clamp-2 text-sm font-medium">
                      {l.name}
                    </Link>
                    <span className="text-xs text-muted">สี {l.color} · ไซซ์ {l.size}</span>
                    <div className="mt-auto flex items-center justify-between">
                      <QtyStepper value={l.qty} max={l.stock} onChange={(q) => setQty(l.variantId, q)} small />
                      <span className="text-sm font-semibold">฿{(l.price * l.qty).toLocaleString("th-TH")}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(l.variantId)} className="self-start text-muted hover:text-ink" aria-label="ลบสินค้า">
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {lines.length > 0 && (
          <div className="space-y-3 border-t border-line p-4">
            <div className="flex justify-between font-semibold">
              <span>ยอดรวมสินค้า</span>
              <span>฿{subtotal.toLocaleString("th-TH")}</span>
            </div>
            <p className="text-xs text-muted">ค่าจัดส่งและส่วนลดคำนวณในขั้นตอนถัดไป</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" className="btn-outline" onClick={() => setDrawerOpen(false)}>ดูตะกร้า</Link>
              <Link href="/checkout" className="btn-primary" onClick={() => setDrawerOpen(false)}>ชำระเงิน</Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
