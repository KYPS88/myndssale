import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, type Coupon } from "../lib/pricing.ts";

const rules = { flat: 50, freeMin: 990, codFee: 20 };
const coupon = (c: Partial<Coupon>): Coupon => ({
  code: "X", type: "percent", value: 10, min_subtotal: 0, max_discount: null, starts_at: null, ends_at: null,
  usage_limit: null, used_count: 0, active: 1, ...c,
});

test("flat shipping below threshold, free at threshold", () => {
  assert.deepEqual(computeTotals([{ price: 289, qty: 2 }], rules).total, 628);
  const t = computeTotals([{ price: 495, qty: 2 }], rules);
  assert.equal(t.shipping, 0);
  assert.equal(t.total, 990);
});

test("percent coupon with cap and COD fee", () => {
  const t = computeTotals([{ price: 1000, qty: 1 }], rules, { coupon: coupon({ value: 20, max_discount: 150 }), cod: true });
  assert.equal(t.discount, 150);
  assert.equal(t.total, 1000 - 150 + 0 + 20);
});

test("fixed coupon cannot exceed subtotal; free_shipping coupon zeroes shipping", () => {
  assert.equal(computeTotals([{ price: 100, qty: 1 }], rules, { coupon: coupon({ type: "fixed", value: 500 }) }).discount, 100);
  const t = computeTotals([{ price: 100, qty: 1 }], rules, { coupon: coupon({ type: "free_shipping" }) });
  assert.equal(t.shipping, 0);
  assert.equal(t.total, 100);
});

test("coupon problems: min subtotal, expiry, usage limit, inactive", () => {
  const lines = [{ price: 300, qty: 1 }];
  assert.match(computeTotals(lines, rules, { coupon: coupon({ min_subtotal: 500 }) }).couponError!, /ขั้นต่ำ/);
  assert.match(computeTotals(lines, rules, { coupon: coupon({ ends_at: "2020-01-01T00:00:00Z" }) }).couponError!, /หมดอายุ/);
  assert.match(computeTotals(lines, rules, { coupon: coupon({ usage_limit: 1, used_count: 1 }) }).couponError!, /ครบ/);
  assert.match(computeTotals(lines, rules, { coupon: null }).couponError!, /ไม่พบ/);
  assert.equal(computeTotals(lines, rules, { coupon: coupon({ active: 0 }) }).discount, 0);
});
