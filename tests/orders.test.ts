import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openDb, importProducts } from "../lib/db.ts";
import { parseProductMaster } from "../lib/catalog.ts";
import { CheckoutError, createOrder, getOrder, updateOrder, validateCheckout } from "../lib/orders.ts";

function setup() {
  const db = openDb(":memory:");
  importProducts(db, parseProductMaster(readFileSync("data/product-master.csv", "utf8")));
  return db;
}
const variant = (db: ReturnType<typeof setup>, sku: string) =>
  db.prepare("SELECT id, stock, price FROM variants WHERE sku = ?").get(sku) as { id: number; stock: number; price: number };
const input = (items: { variantId: number; qty: number }[], extra: Record<string, unknown> = {}) =>
  validateCheckout({
    items,
    customer: { name: "ทดสอบ ระบบ", phone: "081-234-5678", address: "1/2 ถนนทดสอบ", province: "กรุงเทพมหานคร", postcode: "10160" },
    paymentMethod: "transfer",
    acceptTerms: true,
    ...extra,
  });

test("order decrements stock, uses server prices and shipping rules", () => {
  const db = setup();
  const v = variant(db, "ATL-BS-BLACK-2XL");
  const o = createOrder(input([{ variantId: v.id, qty: 2 }]), db);
  assert.equal(o.total, 359 * 2 + 50);
  assert.equal(variant(db, "ATL-BS-BLACK-2XL").stock, v.stock - 2);
  const full = getOrder(o.orderNo, db)!;
  assert.equal(full.phone, "0812345678");
  assert.equal(full.items[0].price, 359);
});

test("rejects overselling and keeps stock unchanged", () => {
  const db = setup();
  const v = variant(db, "ATL-BS-BLACK-S"); // stock 1
  assert.throws(() => createOrder(input([{ variantId: v.id, qty: 2 }]), db), CheckoutError);
  assert.equal(variant(db, "ATL-BS-BLACK-S").stock, v.stock);
  assert.equal((db.prepare("SELECT COUNT(*) n FROM orders").get() as { n: number }).n, 0);
});

test("cancelling restocks; reactivating deducts again", () => {
  const db = setup();
  const v = variant(db, "ATL-BS-BLACK-M");
  const o = createOrder(input([{ variantId: v.id, qty: 3 }]), db);
  updateOrder(o.orderNo, { status: "cancelled" }, db);
  assert.equal(variant(db, "ATL-BS-BLACK-M").stock, v.stock);
  updateOrder(o.orderNo, { status: "paid" }, db);
  assert.equal(variant(db, "ATL-BS-BLACK-M").stock, v.stock - 3);
});

test("coupon applied and counted; hidden products cannot be bought", () => {
  const db = setup();
  db.prepare("INSERT INTO coupons (code, type, value, usage_limit) VALUES ('COOL10','percent',10,1)").run();
  const v = variant(db, "ATL-BS-BLACK-L");
  const o = createOrder(input([{ variantId: v.id, qty: 1 }], { couponCode: "cool10" }), db);
  assert.equal(o.total, 359 - 35.9 + 50);
  assert.throws(() => createOrder(input([{ variantId: v.id, qty: 1 }], { couponCode: "COOL10" }), db), /ครบ/);
  const pillow = db.prepare("SELECT v.id FROM variants v JOIN products p ON p.id=v.product_id WHERE p.sku='PILLOW'").get() as { id: number };
  assert.throws(() => createOrder(input([{ variantId: pillow.id, qty: 1 }]), db), /ไม่พร้อมขาย/);
});

test("validation errors", () => {
  assert.throws(() => input([]), /ตะกร้า/);
  assert.throws(() => validateCheckout({ items: [{ variantId: 1, qty: 1 }], customer: { name: "ab", phone: "12", address: "x", province: "", postcode: "" }, paymentMethod: "transfer", acceptTerms: true }), /เบอร์/);
  assert.throws(() => input([{ variantId: 1, qty: 1 }], { acceptTerms: false }), /ยอมรับ/);
});
