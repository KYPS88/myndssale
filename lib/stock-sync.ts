import type { DatabaseSync } from "node:sqlite";
import { getDb, transaction } from "./db.ts";
import { fetchJstStock, jstConfigFromEnv } from "./jst.ts";

/** แหล่งสต็อกภายนอก (ตอนนี้มี JST) — แยกเป็น interface เพื่อเทสต์และเปลี่ยนผู้ให้บริการได้ */
export type StockSource = {
  name: string;
  fetch(skus: string[]): Promise<Map<string, number>>;
};

export function jstSourceFromEnv(): StockSource | null {
  const cfg = jstConfigFromEnv();
  if (!cfg) return null;
  return { name: "jst", fetch: (skus) => fetchJstStock(cfg, skus) };
}

/**
 * ออเดอร์เว็บที่ยังไม่ได้ส่งออก JST ไม่รู้จัก จึงหักออกจากยอด JST เพื่อกันขายเกิน
 * (ระหว่างที่ทีมคีย์ออเดอร์เข้า JST แล้วแต่ยังไม่จัดส่ง ยอดจะถูกหักซ้ำชั่วคราว = แสดงน้อยกว่าจริงเล็กน้อย ซึ่งปลอดภัยกว่าขายเกิน)
 */
export const RESERVING_STATUSES = ["pending_payment", "paid", "processing"];

export type StockChange = { sku: string; from: number; to: number };
export type SyncResult = {
  ok: boolean;
  checked: number;
  updated: number;
  missing: string[];
  changes: StockChange[];
  error?: string;
  logId: number;
};

let running = false;

/**
 * นำยอดสต็อกจากแหล่งภายนอก (JST API หรือไฟล์ export จาก JST) มาอัปเดตบนเว็บ
 * dryRun = คำนวณให้ดูว่าจะเปลี่ยนอะไรบ้าง โดยยังไม่บันทึก
 */
export async function syncStock(
  source: StockSource,
  trigger: "auto" | "manual" | "upload",
  db: DatabaseSync = getDb(),
  opts: { dryRun?: boolean } = {},
): Promise<SyncResult> {
  const empty = { checked: 0, updated: 0, missing: [], changes: [] };
  if (running) return { ok: false, ...empty, error: "กำลังซิงก์อยู่แล้ว", logId: 0 };
  running = true;
  const logId = opts.dryRun
    ? 0
    : Number(db.prepare("INSERT INTO stock_sync_log (source, trigger) VALUES (?, ?)").run(source.name, trigger).lastInsertRowid);
  try {
    const variants = db.prepare("SELECT id, sku, stock FROM variants").all() as { id: number; sku: string; stock: number }[];
    const remote = await source.fetch(variants.map((v) => v.sku));

    const reserved = new Map<number, number>();
    const rows = db
      .prepare(
        `SELECT oi.variant_id AS id, SUM(oi.qty) AS qty FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.status IN (${RESERVING_STATUSES.map(() => "?").join(",")}) AND oi.variant_id IS NOT NULL GROUP BY oi.variant_id`,
      )
      .all(...RESERVING_STATUSES) as { id: number; qty: number }[];
    for (const r of rows) reserved.set(r.id, r.qty);

    const missing: string[] = [];
    const changes: StockChange[] = [];
    const upd = db.prepare("UPDATE variants SET stock = ? WHERE id = ?");
    const apply = () => {
      for (const v of variants) {
        const qty = remote.get(v.sku.toUpperCase());
        if (qty == null) {
          missing.push(v.sku); // ไม่พบใน JST → คงค่าเดิม
          continue;
        }
        const next = Math.max(0, qty - (reserved.get(v.id) ?? 0));
        if (next !== v.stock) {
          if (!opts.dryRun) upd.run(next, v.id);
          changes.push({ sku: v.sku, from: v.stock, to: next });
        }
      }
    };
    if (opts.dryRun) apply();
    else transaction(db, apply);
    const checked = variants.length - missing.length;
    if (!opts.dryRun) {
      db.prepare(
        "UPDATE stock_sync_log SET finished_at = datetime('now'), ok = 1, checked = ?, updated = ?, missing = ? WHERE id = ?",
      ).run(checked, changes.length, missing.join(","), logId);
    }
    return { ok: true, checked, updated: changes.length, missing, changes, logId };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    if (!opts.dryRun) {
      db.prepare("UPDATE stock_sync_log SET finished_at = datetime('now'), ok = 0, error = ? WHERE id = ?").run(error.slice(0, 1000), logId);
    }
    return { ok: false, ...empty, error, logId };
  } finally {
    running = false;
  }
}

export type SyncLog = {
  id: number; source: string; trigger: string; started_at: string; finished_at: string | null;
  ok: number; checked: number; updated: number; missing: string | null; error: string | null;
};

export function recentSyncLogs(limit = 20, db = getDb()): SyncLog[] {
  return db.prepare("SELECT * FROM stock_sync_log ORDER BY id DESC LIMIT ?").all(limit) as SyncLog[];
}

/** ซิงก์อัตโนมัติทุก JST_SYNC_MINUTES นาที (ค่าเริ่มต้น 10, ใส่ 0 = ปิด) — เรียกครั้งเดียวตอนเซิร์ฟเวอร์เริ่ม */
export function startStockSyncSchedule() {
  const source = jstSourceFromEnv();
  const minutes = Number(process.env.JST_SYNC_MINUTES ?? 10);
  if (!source || !(minutes > 0)) return;
  const g = globalThis as { __myndsStockTimer?: ReturnType<typeof setInterval> };
  if (g.__myndsStockTimer) return;
  const run = () => void syncStock(source, "auto").catch((e) => console.error("stock sync failed", e));
  setTimeout(run, 30_000);
  g.__myndsStockTimer = setInterval(run, Math.max(1, minutes) * 60_000);
  console.log(`[stock-sync] JST sync every ${minutes} min`);
}
