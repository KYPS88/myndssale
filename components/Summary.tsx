import type { Quote } from "./useCartQuote";

const b = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

export function Summary({ totals, freeShippingMin }: { totals: Quote["totals"]; freeShippingMin: number }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt>ยอดรวมสินค้า</dt><dd>{b(totals.subtotal)}</dd></div>
      {totals.discount > 0 && <div className="flex justify-between text-sale"><dt>ส่วนลด</dt><dd>-{b(totals.discount)}</dd></div>}
      <div className="flex justify-between"><dt>ค่าจัดส่ง</dt><dd>{totals.shipping === 0 ? "ฟรี" : b(totals.shipping)}</dd></div>
      {totals.codFee > 0 && <div className="flex justify-between"><dt>ค่าธรรมเนียมเก็บเงินปลายทาง</dt><dd>{b(totals.codFee)}</dd></div>}
      {freeShippingMin > 0 && totals.shipping > 0 && (
        <p className="text-xs text-ice-dark">ช้อปเพิ่มอีก {b(Math.max(0, freeShippingMin - totals.subtotal))} รับส่งฟรี</p>
      )}
      <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>ยอดชำระทั้งหมด</dt><dd>{b(totals.total)}</dd></div>
      <p className="text-xs text-muted">ราคารวมภาษีมูลค่าเพิ่มแล้ว</p>
    </dl>
  );
}
