/**
 * เชื่อมต่อ JST (聚水潭 Jushuitan open platform v2) เพื่ออ่านสต็อก
 *
 * ⚠️ เขียนตามรูปแบบมาตรฐานของ JST open API v2 — ยังต้องยืนยันกับเอกสาร/คีย์จริงจาก JST
 * ค่าที่อาจต่างได้ปรับผ่าน env โดยไม่ต้องแก้โค้ด: JST_API_BASE, JST_INVENTORY_PATH, JST_WMS_CO_ID
 *
 * รูปแบบคำขอ: POST application/x-www-form-urlencoded
 *   app_key, access_token, timestamp (วินาที), charset=utf-8, version=2, biz (JSON string), sign
 *   sign = md5( app_secret + ต่อกัน key+value ของทุกพารามิเตอร์ (ยกเว้น sign) เรียงตาม key ) เป็นตัวพิมพ์เล็ก
 * ผลลัพธ์: { code: 0, msg, data: { has_next, inventorys: [{ sku_id, qty, order_lock, ... }] } }
 */
import { createHash } from "node:crypto";

export type JstConfig = {
  appKey: string;
  appSecret: string;
  accessToken: string;
  baseUrl: string;
  inventoryPath: string;
  wmsCoId: number | null;
};

export function jstConfigFromEnv(env: Record<string, string | undefined> = process.env): JstConfig | null {
  const appKey = env.JST_APP_KEY?.trim();
  const appSecret = env.JST_APP_SECRET?.trim();
  const accessToken = env.JST_ACCESS_TOKEN?.trim();
  if (!appKey || !appSecret || !accessToken) return null;
  const wms = Number(env.JST_WMS_CO_ID);
  return {
    appKey,
    appSecret,
    accessToken,
    baseUrl: (env.JST_API_BASE?.trim() || "https://openapi.jushuitan.com").replace(/\/$/, ""),
    inventoryPath: env.JST_INVENTORY_PATH?.trim() || "/open/inventory/query",
    wmsCoId: Number.isFinite(wms) && env.JST_WMS_CO_ID?.trim() ? wms : null,
  };
}

export function jstSign(params: Record<string, string>, appSecret: string): string {
  const body = Object.keys(params)
    .filter((k) => k !== "sign")
    .sort()
    .map((k) => k + params[k])
    .join("");
  return createHash("md5").update(appSecret + body, "utf8").digest("hex");
}

export function buildJstRequest(cfg: JstConfig, biz: unknown, now = Date.now()): URLSearchParams {
  const params: Record<string, string> = {
    app_key: cfg.appKey,
    access_token: cfg.accessToken,
    timestamp: String(Math.floor(now / 1000)),
    charset: "utf-8",
    version: "2",
    biz: JSON.stringify(biz),
  };
  params.sign = jstSign(params, cfg.appSecret);
  return new URLSearchParams(params);
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export type JstInventoryRow = Record<string, unknown> & { sku_id?: string };

/** จำนวนพร้อมขาย: ใช้ available_qty ถ้า JST ส่งมา ไม่งั้นคิด qty − order_lock (ของที่ถูกจอง) */
export function availableQty(row: JstInventoryRow): number {
  const n = (k: string) => {
    const v = Number(row[k]);
    return Number.isFinite(v) ? v : 0;
  };
  const raw = row.available_qty != null ? n("available_qty") : n("qty") - n("order_lock");
  return Math.max(0, Math.floor(raw));
}

export async function jstCall(cfg: JstConfig, path: string, biz: unknown, fetchImpl: FetchLike = fetch as unknown as FetchLike) {
  const res = await fetchImpl(cfg.baseUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: buildJstRequest(cfg, biz).toString(),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json: { code?: number | string; msg?: string; data?: unknown } & Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`JST ตอบกลับไม่ใช่ JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || (json.code != null && Number(json.code) !== 0)) {
    throw new Error(`JST error (HTTP ${res.status}, code ${json.code ?? "-"}): ${json.msg ?? text.slice(0, 200)}`);
  }
  return json;
}

const BATCH = 100;

/** ดึงสต็อกพร้อมขายตาม SKU (ทีละ 100 SKU, รองรับหลายหน้า) → Map<SKU ตัวพิมพ์ใหญ่, จำนวน> */
export async function fetchJstStock(cfg: JstConfig, skus: string[], fetchImpl?: FetchLike): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < skus.length; i += BATCH) {
    const chunk = skus.slice(i, i + BATCH);
    for (let page = 1; page <= 50; page++) {
      const biz: Record<string, unknown> = { page_index: page, page_size: BATCH, sku_ids: chunk.join(",") };
      if (cfg.wmsCoId != null) biz.wms_co_id = cfg.wmsCoId;
      const json = await jstCall(cfg, cfg.inventoryPath, biz, fetchImpl);
      const data = (json.data ?? {}) as { inventorys?: JstInventoryRow[]; has_next?: boolean };
      for (const row of data.inventorys ?? []) {
        if (!row.sku_id) continue;
        const key = String(row.sku_id).toUpperCase();
        // หลายคลัง → รวมยอด
        out.set(key, (out.get(key) ?? 0) + availableQty(row));
      }
      if (!data.has_next) break;
    }
  }
  return out;
}
