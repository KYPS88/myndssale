import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { openDb, importProducts } from "../lib/db.ts";
import { parseProductMaster } from "../lib/catalog.ts";
import { createOrder, updateOrder, validateCheckout } from "../lib/orders.ts";
import { availableQty, buildJstRequest, fetchJstStock, jstConfigFromEnv, jstSign, type JstConfig } from "../lib/jst.ts";
import { recentSyncLogs, syncStock, type StockSource } from "../lib/stock-sync.ts";

const cfg: JstConfig = { appKey: "KEY", appSecret: "SECRET", accessToken: "TOKEN", baseUrl: "https://jst.example", inventoryPath: "/open/inventory/query", wmsCoId: null };

test("sign = md5(secret + sorted key+value pairs), lowercase, ignores sign", () => {
  const expected = createHash("md5").update("SECRETa1b2c3").digest("hex");
  assert.equal(jstSign({ c: "3", a: "1", b: "2", sign: "x" }, "SECRET"), expected);
  const p = buildJstRequest(cfg, { sku_ids: "A,B" }, 1_700_000_000_000);
  assert.equal(p.get("timestamp"), "1700000000");
  assert.equal(p.get("version"), "2");
  assert.equal(p.get("biz"), '{"sku_ids":"A,B"}');
  const rest = Object.fromEntries([...p.entries()].filter(([k]) => k !== "sign"));
  assert.equal(p.get("sign"), jstSign(rest, "SECRET"));
});

test("config requires key/secret/token; wms id optional", () => {
  assert.equal(jstConfigFromEnv({}), null);
  const c = jstConfigFromEnv({ JST_APP_KEY: "k", JST_APP_SECRET: "s", JST_ACCESS_TOKEN: "t", JST_API_BASE: "https://x.test/", JST_WMS_CO_ID: "12" })!;
  assert.equal(c.baseUrl, "https://x.test");
  assert.equal(c.wmsCoId, 12);
});

test("available = available_qty or qty - order_lock, never negative", () => {
  assert.equal(availableQty({ qty: 10, order_lock: 3 }), 7);
  assert.equal(availableQty({ qty: 2, order_lock: 5 }), 0);
  assert.equal(availableQty({ qty: 10, order_lock: 3, available_qty: 4 }), 4);
});

test("fetchJstStock: batches, pagination, sums warehouses, raises JST errors", async () => {
  const calls: URLSearchParams[] = [];
  const fake = async (_url: string, init: { body: string }) => {
    const p = new URLSearchParams(init.body);
    calls.push(p);
    const biz = JSON.parse(p.get("biz")!);
    const data =
      biz.page_index === 1
        ? { has_next: true, inventorys: [{ sku_id: "a-1", qty: 5, order_lock: 1 }] }
        : { has_next: false, inventorys: [{ sku_id: "A-1", qty: 2, order_lock: 0 }, { sku_id: "B-2", qty: 9 }] };
    return { ok: true, status: 200, text: async () => JSON.stringify({ code: 0, msg: "ok", data }) };
  };
  const m = await fetchJstStock(cfg, ["A-1", "B-2"], fake);
  assert.equal(m.get("A-1"), 6);
  assert.equal(m.get("B-2"), 9);
  assert.equal(calls.length, 2);
  const err = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ code: 100, msg: "token expired" }) });
  await assert.rejects(fetchJstStock(cfg, ["A-1"], err), /token expired/);
});

function setup() {
  const db = openDb(":memory:");
  importProducts(db, parseProductMaster(readFileSync("data/product-master.csv", "utf8")));
  return db;
}
const stockOf = (db: ReturnType<typeof setup>, sku: string) =>
  (db.prepare("SELECT id, stock FROM variants WHERE sku = ?").get(sku) as { id: number; stock: number });

test("syncStock: applies remote stock, subtracts open web orders, keeps unknown SKUs, logs", async () => {
  const db = setup();
  const m = stockOf(db, "ATL-BS-BLACK-M");
  const before = stockOf(db, "ATL-BS-BLACK-L").stock;
  createOrder(
    validateCheckout({
      items: [{ variantId: m.id, qty: 2 }],
      customer: { name: "ทดสอบ", phone: "0812345678", address: "1/1 ถนน", province: "กรุงเทพมหานคร", postcode: "10160" },
      paymentMethod: "transfer",
      acceptTerms: true,
    }),
    db,
  );
  const source: StockSource = { name: "fake", fetch: async () => new Map([["ATL-BS-BLACK-M", 50], ["ATL-BS-BLACK-S", 0]]) };
  const r = await syncStock(source, "manual", db);
  assert.equal(r.ok, true);
  assert.equal(stockOf(db, "ATL-BS-BLACK-M").stock, 48); // 50 − 2 รอชำระ
  assert.equal(stockOf(db, "ATL-BS-BLACK-L").stock, before); // ไม่พบ → คงเดิม
  assert.ok(r.missing.includes("ATL-BS-BLACK-L"));
  assert.equal(recentSyncLogs(5, db)[0].ok, 1);

  // จัดส่งแล้ว → ไม่หักอีก (JST ตัดสต็อกเองแล้ว)
  const order = db.prepare("SELECT order_no FROM orders").get() as { order_no: string };
  updateOrder(order.order_no, { status: "shipped" }, db);
  await syncStock(source, "manual", db);
  assert.equal(stockOf(db, "ATL-BS-BLACK-M").stock, 50);
});

test("syncStock: failure is logged and stock untouched", async () => {
  const db = setup();
  const before = stockOf(db, "ATL-BS-BLACK-M").stock;
  const r = await syncStock({ name: "fake", fetch: async () => { throw new Error("network down"); } }, "auto", db);
  assert.equal(r.ok, false);
  assert.equal(stockOf(db, "ATL-BS-BLACK-M").stock, before);
  const log = recentSyncLogs(1, db)[0];
  assert.equal(log.ok, 0);
  assert.match(log.error!, /network down/);
});
