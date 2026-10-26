import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseProductMaster } from "../lib/catalog.ts";
import { CATEGORY_TILES, HERO_COLLECTION, NAV, productsHref } from "../components/nav.ts";

const products = parseProductMaster(readFileSync("data/product-master.csv", "utf8")).filter((p) => p.status === "active");

// ถ้าชีตเปลี่ยนชื่อหมวด/คอลเลกชัน ลิงก์เมนูจะพาไปหน้าว่าง — test นี้จับได้ก่อน deploy
test("menu and home links all lead to products from the sheet", () => {
  const links = [...NAV, ...CATEGORY_TILES, { label: "hero", href: productsHref("collection", [HERO_COLLECTION]) }];
  for (const { label, href } of links) {
    const q = new URLSearchParams(href.split("?")[1] ?? "");
    for (const key of ["category", "collection"] as const) {
      const want = q.get(key)?.split(",");
      if (!want) continue;
      assert.ok(products.some((p) => want.includes(p[key] ?? "")), `${label}: ไม่มีสินค้าที่ ${key} = "${want.join(", ")}"`);
    }
  }
});

test("sheet typos are normalised", () => {
  const all = parseProductMaster(readFileSync("data/product-master.csv", "utf8"));
  assert.ok(!all.some((p) => /เเ/.test(`${p.name} ${p.category} ${p.collection ?? ""} ${p.description ?? ""}`)));
  const ultra = new Set(all.map((p) => p.collection).filter((c) => c && /ultra\s*cool/i.test(c)));
  assert.equal(ultra.size, 1);
});
