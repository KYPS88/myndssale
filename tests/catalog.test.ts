import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeColor, normalizeSize, parseProductMaster } from "../lib/catalog.ts";
import { parseCsv } from "../lib/csv.ts";

test("csv parser handles quoted newlines and commas", () => {
  assert.deepEqual(parseCsv('a,b\n"x\ny","1,2"\n'), [["a", "b"], ["x\ny", "1,2"]]);
});

test("size and color normalisation", () => {
  assert.equal(normalizeSize("4Xl"), "4XL");
  assert.equal(normalizeSize(" xxl "), "2XL");
  assert.equal(normalizeColor("DARK GRAY"), "Dark Gray");
  assert.equal(normalizeColor("Dark Gray"), "Dark Gray");
  assert.equal(normalizeColor("BLACK / WHITE"), "Black/White");
  assert.equal(normalizeColor("ดำ"), "ดำ");
});

test("product master from the brief sheet", () => {
  const ps = parseProductMaster(readFileSync("data/product-master.csv", "utf8"));
  assert.equal(ps.length, 58);
  assert.equal(ps.reduce((n, p) => n + p.variants.length, 0), 1641);
  const atl = ps.find((p) => p.sku === "ATL-BS")!;
  assert.equal(atl.status, "active");
  assert.ok(atl.variants.some((v) => v.size === "4XL"));
  const v = atl.variants.find((x) => x.sku === "ATL-BS-BLACK-2XL")!;
  assert.equal(v.price, 359);
  assert.equal(v.compareAt, 790);
  // ของแถม / ไม่มีราคา → ซ่อน
  assert.equal(ps.find((p) => p.sku === "PILLOW")!.status, "hidden");
  assert.equal(ps.find((p) => p.sku === "CDG02")!.status, "hidden");
  assert.equal(ps.find((p) => p.sku === "OVSKIDS")!.gender, "KIDS");
  assert.equal(ps.find((p) => p.sku === "MPL0001")!.category, "เสื้อโปโล");
  // ไม่มีชื่อซ้ำหลังเติมรหัสลาย
  assert.equal(new Set(ps.map((p) => p.name)).size, ps.length);
  // ไม่มีคอลัมน์ต้นทุนในไฟล์
  assert.ok(!readFileSync("data/product-master.csv", "utf8").split("\n")[0].includes("ต้นทุน"));
});
