/**
 * อ่านไฟล์รายงานสต็อกที่ export จาก JST (Excel .xlsx หรือ .csv) → Map<SKU ตัวพิมพ์ใหญ่, จำนวนพร้อมขาย>
 * หาแถวหัวตารางและคอลัมน์ให้อัตโนมัติจากชื่อที่พบบ่อย (ไทย/อังกฤษ/จีน) หรือระบุชื่อคอลัมน์เองได้
 */
import { readSheet } from "read-excel-file/node";
import { parseCsv } from "./csv.ts";

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-()/（）]+/g, "");

// เรียงจากเจาะจงที่สุด → ทั่วไป
const SKU_HEADERS = ["商品编码", "skuid", "skucode", "sku编码", "variantsku", "รหัสvariantsku", "รหัสsku", "sku", "รหัสสินค้า", "itemcode", "productcode", "商品编号"];
const AVAILABLE_HEADERS = ["可用数", "可用库存", "可用库存数", "availableqty", "available", "availablestock", "พร้อมขาย", "จำนวนพร้อมขาย", "คงเหลือพร้อมขาย"];
const QTY_HEADERS = ["实际库存数", "实际库存", "库存数", "主仓实际库存", "数量", "qty", "quantity", "stock", "onhand", "จำนวน", "คงเหลือ", "สต็อก", "จำนวนคงเหลือ"];
const LOCK_HEADERS = ["订单占有数", "订单占用数", "orderlock", "locked", "lockedqty", "จอง", "จำนวนจอง"];

function findCol(header: string[], wanted: string[]): number {
  const h = header.map((x) => norm(x));
  for (const w of wanted) {
    const i = h.indexOf(norm(w));
    if (i >= 0) return i;
  }
  return -1;
}

export type StockFileOptions = { skuColumn?: string; qtyColumn?: string };

export type ParsedStockFile = {
  stock: Map<string, number>;
  skuHeader: string;
  qtyHeader: string; // คำอธิบายว่าคิดจำนวนจากคอลัมน์ไหน
  dataRows: number;
  skipped: number; // แถวที่ไม่มี SKU หรือจำนวนอ่านไม่ได้
  headers: string[];
};

function decodeText(buf: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("�")) return utf8;
  // ไฟล์ CSV จาก Excel ภาษาจีน/ไทย อาจไม่ใช่ UTF-8
  for (const enc of ["gb18030", "windows-874"]) {
    try {
      const t = new TextDecoder(enc).decode(buf);
      if (!t.includes("�")) return t;
    } catch {}
  }
  return utf8;
}

export async function readRows(buf: Uint8Array, filename: string): Promise<string[][]> {
  if (/\.xlsx$/i.test(filename)) {
    const rows = await readSheet(Buffer.from(buf)); // ชีตแรกของไฟล์
    return rows.map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString() : String(c))));
  }
  if (/\.xls$/i.test(filename)) throw new Error("ไฟล์ .xls (Excel แบบเก่า) ยังไม่รองรับ — กรุณาบันทึกเป็น .xlsx หรือ .csv");
  return parseCsv(decodeText(buf));
}

export function parseStockRows(rows: string[][], opts: StockFileOptions = {}): ParsedStockFile {
  // หัวตารางอาจไม่ใช่แถวแรก (บางรายงานมีชื่อรายงานด้านบน) → หาแถวแรกที่มีคอลัมน์ SKU
  let headerIdx = -1;
  let skuCol = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const col = opts.skuColumn ? findCol(rows[i], [opts.skuColumn]) : findCol(rows[i], SKU_HEADERS);
    if (col >= 0) {
      headerIdx = i;
      skuCol = col;
      break;
    }
  }
  if (headerIdx < 0) {
    throw new Error(
      opts.skuColumn
        ? `ไม่พบคอลัมน์ “${opts.skuColumn}” ในไฟล์`
        : "หาคอลัมน์รหัส SKU ไม่เจอ — กรุณาพิมพ์ชื่อคอลัมน์ SKU ตามที่อยู่ในไฟล์",
    );
  }
  const header = rows[headerIdx].map((h) => h.trim());

  let qtyOf: (r: string[]) => number | null;
  let qtyHeader: string;
  const num = (v: string | undefined) => {
    const n = Number(String(v ?? "").replace(/,/g, "").trim());
    return String(v ?? "").trim() === "" || !Number.isFinite(n) ? null : n;
  };
  if (opts.qtyColumn) {
    const c = findCol(header, [opts.qtyColumn]);
    if (c < 0) throw new Error(`ไม่พบคอลัมน์ “${opts.qtyColumn}” ในไฟล์`);
    qtyOf = (r) => num(r[c]);
    qtyHeader = header[c];
  } else {
    const avail = findCol(header, AVAILABLE_HEADERS);
    const qty = findCol(header, QTY_HEADERS);
    const lock = findCol(header, LOCK_HEADERS);
    if (avail >= 0) {
      qtyOf = (r) => num(r[avail]);
      qtyHeader = header[avail];
    } else if (qty >= 0) {
      qtyOf = (r) => {
        const q = num(r[qty]);
        return q == null ? null : q - (lock >= 0 ? num(r[lock]) ?? 0 : 0);
      };
      qtyHeader = lock >= 0 ? `${header[qty]} − ${header[lock]}` : header[qty];
    } else {
      throw new Error("หาคอลัมน์จำนวนสต็อกไม่เจอ — กรุณาพิมพ์ชื่อคอลัมน์จำนวนพร้อมขายตามที่อยู่ในไฟล์");
    }
  }

  const stock = new Map<string, number>();
  let dataRows = 0;
  let skipped = 0;
  for (const r of rows.slice(headerIdx + 1)) {
    const sku = String(r[skuCol] ?? "").trim().toUpperCase();
    const q = qtyOf(r);
    if (!sku || q == null) {
      if (r.some((c) => String(c).trim() !== "")) skipped++;
      continue;
    }
    dataRows++;
    // หลายคลัง/หลายแถวต่อ SKU → รวมยอด
    stock.set(sku, (stock.get(sku) ?? 0) + Math.max(0, Math.floor(q)));
  }
  if (!stock.size) throw new Error("ไม่พบข้อมูลสต็อกในไฟล์");
  return { stock, skuHeader: header[skuCol], qtyHeader, dataRows, skipped, headers: header.filter(Boolean) };
}
