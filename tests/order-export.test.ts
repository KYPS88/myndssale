import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openDb, importProducts } from "../lib/db.ts";
import { parseProductMaster } from "../lib/catalog.ts";
import { createOrder, ordersForExport, validateCheckout } from "../lib/orders.ts";
import { ordersToCsv, bangkokTime } from "../lib/order-export.ts";
import { parseCsv } from "../lib/csv.ts";

function setup() {
  const db = openDb(":memory:");
  importProducts(db, parseProductMaster(readFileSync("data/product-master.csv", "utf8")));
  const v = (sku: string) => (db.prepare("SELECT id FROM variants WHERE sku = ?").get(sku) as { id: number }).id;
  createOrder(
    validateCheckout({
      items: [{ variantId: v("ATL-BS-BLACK-M"), qty: 2 }, { variantId: v("ATL-BS-BLACK-L"), qty: 1 }],
      customer: { name: '=HYPERLINK("x") สมชาย', phone: "0812345678", address: '12/3 "บ้าน", ซอย 1', province: "กรุงเทพมหานคร", postcode: "01160" },
      paymentMethod: "transfer",
      acceptTerms: true,
    }),
    db,
  );
  return db;
}

test("CSV: BOM, one row per item, order totals only on the first row, safe cells", () => {
  const db = setup();
  const csv = ordersToCsv(ordersForExport({}, db));
  assert.ok(csv.startsWith("﻿"));
  const rows = parseCsv(csv.slice(1));
  const h = rows[0];
  assert.equal(rows.length, 3); // header + 2 items
  const col = (r: string[], name: string) => r[h.indexOf(name)];
  assert.equal(col(rows[1], "ยอดชำระทั้งหมด"), String(359 * 3)); // ≥ ฿990 ส่งฟรี
  assert.equal(col(rows[1], "ค่าจัดส่ง"), "0");
  assert.equal(col(rows[2], "ยอดชำระทั้งหมด"), "");
  assert.equal(col(rows[1], "รวมรายการ"), String(359 * 2));
  assert.equal(col(rows[1], "เบอร์โทร"), '="0812345678"');
  assert.equal(col(rows[1], "รหัสไปรษณีย์"), '="01160"');
  assert.equal(col(rows[1], "ชื่อลูกค้า"), `'=HYPERLINK("x") สมชาย`);
  assert.equal(col(rows[1], "ที่อยู่"), '12/3 "บ้าน", ซอย 1');
});

test("date filter uses Thai dates", () => {
  const db = setup();
  const today = bangkokTime(new Date().toISOString().slice(0, 19).replace("T", " ")).slice(0, 10);
  assert.equal(ordersForExport({ from: today, to: today }, db).length, 1);
  assert.equal(ordersForExport({ to: "2000-01-01" }, db).length, 0);
  assert.equal(bangkokTime("2026-10-19 20:30:00"), "2026-10-20 03:30");
});
