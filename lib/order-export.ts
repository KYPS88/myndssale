import type { Order } from "./orders.ts";
import { PAYMENT_LABEL, STATUS_LABEL } from "./orders.ts";

type ExportOrder = Omit<Order, "events">;

const HEADERS = [
  "เลขที่คำสั่งซื้อ", "วันที่สั่งซื้อ", "สถานะ", "วิธีชำระเงิน",
  "ชื่อลูกค้า", "เบอร์โทร", "อีเมล", "ที่อยู่", "แขวง/ตำบล", "เขต/อำเภอ", "จังหวัด", "รหัสไปรษณีย์",
  "หมายเหตุลูกค้า", "ข้อมูลใบกำกับภาษี",
  "SKU", "ชื่อสินค้า", "สี", "ไซซ์", "ราคาต่อชิ้น", "จำนวน", "รวมรายการ",
  "ยอดสินค้า", "ส่วนลด", "คูปอง", "ค่าจัดส่ง", "ค่าธรรมเนียม COD", "ยอดชำระทั้งหมด",
  "ขนส่ง", "เลขพัสดุ", "โน้ตภายใน", "ยินยอมรับข่าวสาร",
];

/** "2026-10-19 03:15:00" (UTC จาก SQLite) → "2026-10-19 10:15" เวลาไทย */
export function bangkokTime(utc: string): string {
  const d = new Date(utc.replace(" ", "T") + "Z");
  const t = new Date(d.getTime() + 7 * 3600_000).toISOString();
  return `${t.slice(0, 10)} ${t.slice(11, 16)}`;
}

/** ช่องตัวเลขล้วน (เบอร์โทร, รหัสไปรษณีย์) ห่อเป็นสูตรข้อความ เพื่อให้ Excel ไม่ตัดเลข 0 ข้างหน้า */
function keepDigits(v: string | null): string | null {
  return v && /^\d+$/.test(v) ? `="${v}"` : v;
}

function cell(v: string | number | null | undefined): string {
  if (v == null) return "";
  let s = String(v);
  // กัน CSV/formula injection จากข้อความที่ลูกค้ากรอก (ยกเว้นสูตรข้อความที่เราสร้างเองข้างบน)
  if (/^[=+\-@\t\r]/.test(s) && !/^="\d+"$/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 1 แถวต่อ 1 รายการสินค้า ข้อมูลออเดอร์ซ้ำทุกแถว แต่ยอดเงินระดับออเดอร์ (ยอดสินค้า ส่วนลด ค่าส่ง ยอดรวม)
 * ใส่เฉพาะแถวแรกของแต่ละออเดอร์ เพื่อให้ SUM ใน Excel ไม่นับซ้ำ
 * มี BOM นำหน้าเพื่อให้ Excel อ่านภาษาไทยถูก
 */
export function ordersToCsv(orders: ExportOrder[]): string {
  const lines = [HEADERS.map(cell).join(",")];
  for (const o of orders) {
    const items = o.items.length ? o.items : [null];
    items.forEach((it, i) => {
      const first = i === 0;
      lines.push(
        [
          o.order_no, bangkokTime(o.created_at), STATUS_LABEL[o.status] ?? o.status, PAYMENT_LABEL[o.payment_method] ?? o.payment_method,
          o.customer_name, keepDigits(o.phone), o.email, o.address, o.subdistrict, o.district, o.province, keepDigits(o.postcode),
          o.note, o.tax_invoice,
          it?.sku, it?.name, it?.color, it?.size, it?.price, it?.qty, it ? it.price * it.qty : null,
          first ? o.subtotal : null, first ? o.discount : null, first ? o.coupon_code : null, first ? o.shipping : null,
          first ? o.cod_fee : null, first ? o.total : null,
          o.carrier, o.tracking_no, o.admin_note, o.marketing_consent ? "ใช่" : "ไม่",
        ]
          .map(cell)
          .join(","),
      );
    });
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
