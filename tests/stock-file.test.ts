import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseStockRows, readRows } from "../lib/stock-file.ts";
import { openDb, importProducts } from "../lib/db.ts";
import { parseProductMaster } from "../lib/catalog.ts";
import { syncStock } from "../lib/stock-sync.ts";

test("xlsx: finds header below title rows, qty − order lock, sums warehouses, clamps at 0", async () => {
  const rows = await readRows(readFileSync("tests/fixtures/jst-stock.xlsx"), "jst-stock.xlsx");
  const p = parseStockRows(rows);
  assert.equal(p.skuHeader, "商品编码");
  assert.equal(p.qtyHeader, "实际库存数 − 订单占有数");
  assert.equal(p.stock.get("ATL-BS-BLACK-M"), 35 + 10);
  assert.equal(p.stock.get("ATL-BS-BLACK-L"), 0);
  assert.equal(p.dataRows, 4);
});

test("csv: prefers an 'available' column, case-insensitive SKU, Thai/English headers", () => {
  const p = parseStockRows([["SKU", "Qty", "Available Qty"], ["atl-bs-black-m", "50", "12"], ["", "", ""]]);
  assert.equal(p.stock.get("ATL-BS-BLACK-M"), 12);
  const th = parseStockRows([["รหัสสินค้า", "จำนวนพร้อมขาย"], ["A-1", "1,234"]]);
  assert.equal(th.stock.get("A-1"), 1234);
});

test("explicit column names override detection; clear errors when missing", () => {
  const rows = [["Code", "Name", "Free"], ["A-1", "x", "7"]];
  assert.throws(() => parseStockRows(rows), /SKU/);
  const p = parseStockRows(rows, { skuColumn: "code", qtyColumn: "Free" });
  assert.equal(p.stock.get("A-1"), 7);
  assert.throws(() => parseStockRows(rows, { skuColumn: "Code", qtyColumn: "Nope" }), /Nope/);
});

test("non-UTF-8 CSV (GB18030 from Chinese Excel) is decoded", async () => {
  // "商品编码,可用数\nA-1,5" encoded as GB18030
  const gb = Uint8Array.from([0xc9, 0xcc, 0xc6, 0xb7, 0xb1, 0xe0, 0xc2, 0xeb, 0x2c, 0xbf, 0xc9, 0xd3, 0xc3, 0xca, 0xfd, 0x0a, 0x41, 0x2d, 0x31, 0x2c, 0x35]);
  const p = parseStockRows(await readRows(gb, "stock.csv"));
  assert.equal(p.skuHeader, "商品编码");
  assert.equal(p.stock.get("A-1"), 5);
});

test("dry run reports changes without writing", async () => {
  const db = openDb(":memory:");
  importProducts(db, parseProductMaster(readFileSync("data/product-master.csv", "utf8")));
  const before = (db.prepare("SELECT stock FROM variants WHERE sku='ATL-BS-BLACK-M'").get() as { stock: number }).stock;
  const r = await syncStock({ name: "jst-file", fetch: async () => new Map([["ATL-BS-BLACK-M", 45]]) }, "upload", db, { dryRun: true });
  assert.deepEqual(r.changes, [{ sku: "ATL-BS-BLACK-M", from: before, to: 45 }]);
  assert.equal((db.prepare("SELECT stock FROM variants WHERE sku='ATL-BS-BLACK-M'").get() as { stock: number }).stock, before);
  assert.equal((db.prepare("SELECT COUNT(*) n FROM stock_sync_log").get() as { n: number }).n, 0);
});
