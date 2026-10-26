import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openDb, importProducts } from "../lib/db.ts";
import { parseProductMaster } from "../lib/catalog.ts";

const csv = readFileSync("data/product-master.csv", "utf8");
const stockOf = (db: ReturnType<typeof openDb>, sku: string) =>
  (db.prepare("SELECT stock FROM variants WHERE sku = ?").get(sku) as { stock: number }).stock;

test("re-import keeps current stock when keepStock is set, but updates catalogue fields", () => {
  const db = openDb(":memory:");
  importProducts(db, parseProductMaster(csv));
  const sku = "ATL-BS-BLACK-M";
  const sheetStock = stockOf(db, sku);
  db.prepare("UPDATE variants SET stock = 7 WHERE sku = ?").run(sku);
  db.prepare("UPDATE products SET name = 'old' WHERE sku = 'ATL-BS'").run();

  importProducts(db, parseProductMaster(csv), { keepStock: true });
  assert.equal(stockOf(db, sku), 7);
  assert.notEqual((db.prepare("SELECT name FROM products WHERE sku = 'ATL-BS'").get() as { name: string }).name, "old");

  importProducts(db, parseProductMaster(csv));
  assert.equal(stockOf(db, sku), sheetStock);
});
