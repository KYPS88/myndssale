import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openDb, importProducts } from "../lib/db.ts";
import { parseProductMaster } from "../lib/catalog.ts";
import { bangkokDay, dailyReport, lineClicksByPlace, recordEvent, topProducts } from "../lib/analytics.ts";

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1";

test("counts visitors per day, product views and LINE clicks", () => {
  const db = openDb(":memory:");
  importProducts(db, parseProductMaster(readFileSync("data/product-master.csv", "utf8")));
  const now = new Date("2026-11-02T03:00:00Z");
  const ev = (type: string, path: string, ip: string, place?: string, ua = UA) => recordEvent(db, { type, path, place }, ip, ua, now);

  ev("pageview", "/", "1.1.1.1");
  ev("pageview", "/products/atl-bs", "1.1.1.1");
  ev("pageview", "/products/atl-bs", "2.2.2.2");
  ev("line_order", "/products/atl-bs", "2.2.2.2", "product");
  ev("line_click", "/", "1.1.1.1", "footer");
  ev("line_click", "/", "1.1.1.1", "footer");
  assert.equal(ev("pageview", "/", "3.3.3.3", undefined, "Googlebot/2.1"), false);
  assert.equal(ev("pageview", "/admin/orders", "4.4.4.4"), false);
  assert.equal(ev("hack", "/", "4.4.4.4"), false);

  const day = bangkokDay(now);
  const [r] = dailyReport(db, day, day);
  assert.deepEqual({ ...r }, { day, visitors: 2, pageviews: 3, productViews: 2, lineClicks: 3, lineVisitors: 2 });

  const [p] = topProducts(db, day, day);
  assert.equal(p.slug, "atl-bs");
  assert.equal(p.views, 2);
  assert.equal(p.viewers, 2);
  assert.equal(p.lineOrders, 1);
  assert.ok(p.name);

  const places = Object.fromEntries(lineClicksByPlace(db, day, day).map((x) => [x.place, x.clicks]));
  assert.deepEqual(places, { footer: 2, product: 1 });

  // ไม่เก็บ IP ตรง ๆ
  const raw = JSON.stringify(db.prepare("SELECT * FROM analytics_events").all());
  assert.ok(!raw.includes("1.1.1.1"));
});

test("visitor ids do not carry across days", () => {
  const db = openDb(":memory:");
  const d1 = new Date("2026-11-02T03:00:00Z"), d2 = new Date("2026-11-03T03:00:00Z");
  recordEvent(db, { type: "pageview", path: "/" }, "9.9.9.9", UA, d1);
  recordEvent(db, { type: "pageview", path: "/" }, "9.9.9.9", UA, d2);
  const ids = db.prepare("SELECT DISTINCT visitor FROM analytics_events").all();
  assert.equal(ids.length, 2);
});
