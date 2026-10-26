import { getSettings } from "@/lib/db";
import { jstConfigFromEnv } from "@/lib/jst";
import { recentSyncLogs, RESERVING_STATUSES } from "@/lib/stock-sync";
import { STATUS_LABEL } from "@/lib/orders";
import { cancelStockFile, confirmStockFile, previewStockFile, runStockSync, testJstConnection } from "../../actions";

const time = (s: string | null) => (s ? new Date(s.replace(" ", "T") + "Z").toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "medium" }) : "—");

export default async function StockSync({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; tested?: string; preview?: string; upload_error?: string }> }) {
  const sp = await searchParams;
  const cfg = jstConfigFromEnv();
  const minutes = Number(process.env.JST_SYNC_MINUTES ?? 10);
  const logs = recentSyncLogs();
  const settings = getSettings();
  const lastTest = settings.jst_last_test;
  type Pending = {
    at: number; fileName: string; skuHeader: string; qtyHeader: string; dataRows: number; skipped: number;
    matched: number; missingOnFile: number; notOnWeb: number; notOnWebSample: string[]; changes: { sku: string; from: number; to: number }[];
  };
  const pending: Pending | null = settings.jst_pending_upload ? JSON.parse(settings.jst_pending_upload) : null;
  const lastMissing = logs.find((l) => l.ok && l.source === "jst")?.missing?.split(",").filter(Boolean) ?? [];
  const env = (k: string) => (process.env[k]?.trim() ? "✓ ตั้งแล้ว" : "✗ ยังไม่ได้ตั้ง");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">สต็อกจาก JST</h1>
      {sp.ok && <p className="rounded-lg bg-ice-light p-3 text-sm text-ice-dark">{sp.ok}</p>}
      {sp.error && <p className="rounded-lg bg-sale/10 p-3 text-sm text-sale">{sp.error}</p>}

      <section id="upload" className="card space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">วิธีที่ 1: อัปโหลดไฟล์รายงานสต็อกจาก JST</h2>
          <p className="mt-1 text-sm text-muted">
            ใน JST ส่งออก (Export) รายงานสต็อกเป็น Excel (.xlsx) หรือ CSV แล้วอัปโหลดที่นี่ — ระบบจะแสดงตัวอย่างก่อน แล้วค่อยกดยืนยัน
          </p>
        </div>
        {sp.upload_error && <p className="rounded-lg bg-sale/10 p-3 text-sm text-sale">{sp.upload_error}</p>}
        {!pending && (
          <form action={previewStockFile} className="space-y-3">
            <input type="file" name="file" accept=".xlsx,.csv,text/csv" required className="block text-sm" />
            <details className="text-sm" open={!!(settings.jst_file_sku_col || settings.jst_file_qty_col)}>
              <summary className="cursor-pointer text-muted">ระบุชื่อคอลัมน์เอง (ถ้าระบบหาไม่เจอ)</summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor="sku_col">ชื่อคอลัมน์รหัส SKU</label><input id="sku_col" name="sku_col" defaultValue={settings.jst_file_sku_col} className="input" placeholder="เช่น 商品编码 / SKU" /></div>
                <div><label className="label" htmlFor="qty_col">ชื่อคอลัมน์จำนวนพร้อมขาย</label><input id="qty_col" name="qty_col" defaultValue={settings.jst_file_qty_col} className="input" placeholder="เช่น 可用数 / Available" /></div>
              </div>
              <p className="mt-1 text-xs text-muted">เว้นว่าง = ให้ระบบหาเอง (รองรับชื่อคอลัมน์ไทย/อังกฤษ/จีนที่พบบ่อย) · ระบบจะจำค่าที่กรอกไว้ใช้ครั้งต่อไป</p>
            </details>
            <button className="btn-primary">อ่านไฟล์และดูตัวอย่าง</button>
          </form>
        )}
        {pending && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-soft p-4">
              <p className="font-medium">ไฟล์: {pending.fileName}</p>
              <ul className="mt-1 space-y-0.5 text-ink/80">
                <li>คอลัมน์ SKU: <b>{pending.skuHeader}</b> · คอลัมน์จำนวน: <b>{pending.qtyHeader}</b></li>
                <li>อ่านได้ {pending.dataRows.toLocaleString()} แถว{pending.skipped ? ` (ข้าม ${pending.skipped} แถวที่ไม่มี SKU/จำนวน)` : ""}</li>
                <li>ตรงกับสินค้าบนเว็บ <b>{pending.matched.toLocaleString()}</b> SKU · <b>จะเปลี่ยน {pending.changes.length.toLocaleString()} รายการ</b></li>
                <li>SKU บนเว็บที่ไม่มีในไฟล์: {pending.missingOnFile.toLocaleString()} (คงค่าเดิม)</li>
                {pending.notOnWeb > 0 && <li>SKU ในไฟล์ที่ไม่มีบนเว็บ: {pending.notOnWeb.toLocaleString()} (ข้าม) — เช่น {pending.notOnWebSample.slice(0, 8).join(", ")}</li>}
              </ul>
              {pending.matched === 0 && <p className="mt-2 font-medium text-sale">ไม่มี SKU ตรงกันเลย — ตรวจว่าคอลัมน์ SKU ถูกต้อง หรือรหัสใน JST ตรงกับ “รหัส Variant SKU” บนเว็บ</p>}
            </div>
            {pending.changes.length > 0 && (
              <div className="max-h-80 overflow-auto rounded-lg border border-line">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-soft text-left"><tr><th className="p-2">SKU</th><th className="p-2 text-right">บนเว็บตอนนี้</th><th className="p-2 text-right">หลังอัปเดต</th></tr></thead>
                  <tbody>
                    {pending.changes.slice(0, 300).map((c) => (
                      <tr key={c.sku} className="border-t border-line">
                        <td className="p-2">{c.sku}</td>
                        <td className="p-2 text-right">{c.from}</td>
                        <td className={`p-2 text-right font-medium ${c.to === 0 ? "text-sale" : ""}`}>{c.to}{c.to === 0 ? " (หมด)" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pending.changes.length > 300 && <p className="p-2 text-xs text-muted">…และอีก {pending.changes.length - 300} รายการ</p>}
              </div>
            )}
            <p className="text-xs text-muted">ยอดหลังอัปเดต = จำนวนในไฟล์ − จำนวนในออเดอร์เว็บที่ยังไม่จัดส่ง (กันขายเกิน)</p>
            <div className="flex flex-wrap gap-2">
              <form action={confirmStockFile}><button className="btn-primary" disabled={pending.matched === 0}>ยืนยันอัปเดตสต็อก</button></form>
              <form action={cancelStockFile}><button className="btn-outline">ยกเลิก / อัปโหลดไฟล์ใหม่</button></form>
            </div>
          </div>
        )}
      </section>

      <h2 className="pt-2 text-lg font-semibold">วิธีที่ 2: เชื่อมต่อ API ของ JST อัตโนมัติ (ต้องมี License API)</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3 p-6 text-sm">
          <h2 className="font-semibold">สถานะการตั้งค่า (Railway → Variables)</h2>
          <ul className="space-y-1">
            <li><code>JST_APP_KEY</code> {env("JST_APP_KEY")}</li>
            <li><code>JST_APP_SECRET</code> {env("JST_APP_SECRET")}</li>
            <li><code>JST_ACCESS_TOKEN</code> {env("JST_ACCESS_TOKEN")}</li>
            <li><code>JST_API_BASE</code> {cfg?.baseUrl ?? "https://openapi.jushuitan.com (ค่าเริ่มต้น)"}</li>
            <li><code>JST_INVENTORY_PATH</code> {cfg?.inventoryPath ?? "/open/inventory/query (ค่าเริ่มต้น)"}</li>
            <li><code>JST_WMS_CO_ID</code> {cfg?.wmsCoId ?? "ไม่ระบุ (ทุกคลัง)"}</li>
            <li><code>JST_SYNC_MINUTES</code> {cfg ? (minutes > 0 ? `ซิงก์อัตโนมัติทุก ${minutes} นาที` : "ปิดซิงก์อัตโนมัติ") : "—"}</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <form action={testJstConnection}><button className="btn-outline" disabled={!cfg}>ทดสอบการเชื่อมต่อ</button></form>
            <form action={runStockSync}><button className="btn-primary" disabled={!cfg}>ซิงก์ตอนนี้</button></form>
          </div>
        </div>
        <div className="card space-y-2 p-6 text-sm text-ink/80">
          <h2 className="font-semibold text-ink">ทำงานอย่างไร</h2>
          <p>ระบบดึง “จำนวนพร้อมขาย” ของทุก Variant SKU จาก JST (qty − order_lock) แล้วอัปเดตสต็อกบนเว็บ</p>
          <p>หักจำนวนในออเดอร์เว็บที่ยังไม่จัดส่ง ({RESERVING_STATUSES.map((s) => STATUS_LABEL[s]).join(", ")}) ออกก่อน เพราะ JST ยังไม่รู้จักออเดอร์เหล่านี้ — กันขายเกิน</p>
          <p>SKU ที่ไม่พบใน JST จะไม่ถูกแก้ (ใช้ค่าเดิม) — ตรวจว่ารหัส SKU บนเว็บตรงกับ JST</p>
          <p className="text-xs text-muted">ถ้ายังเชื่อม JST ไม่ได้ แก้สต็อกเองได้ที่ “สินค้า / สต็อก” หรือนำเข้า CSV ตามเดิม</p>
        </div>
      </div>

      {lastTest && (
        <div className="card p-6">
          <h2 className="mb-2 font-semibold">ผลทดสอบการเชื่อมต่อล่าสุด{sp.tested ? " (เพิ่งทดสอบ)" : ""}</h2>
          <pre className="max-h-96 overflow-auto rounded-lg bg-soft p-3 text-xs">{lastTest}</pre>
        </div>
      )}

      {lastMissing.length > 0 && (
        <div className="card p-6 text-sm">
          <h2 className="mb-2 font-semibold">SKU ที่ไม่พบใน JST (รอบล่าสุด) — {lastMissing.length} รายการ</h2>
          <p className="max-h-40 overflow-auto text-xs text-muted">{lastMissing.join(", ")}</p>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left"><tr><th className="p-3">เวลา</th><th className="p-3">แบบ</th><th className="p-3">ผล</th><th className="p-3 text-right">ตรวจ</th><th className="p-3 text-right">อัปเดต</th><th className="p-3 text-right">ไม่พบ</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="p-3 whitespace-nowrap">{time(l.started_at)}</td>
                <td className="p-3">{l.trigger === "auto" ? "อัตโนมัติ (API)" : l.trigger === "upload" ? "อัปโหลดไฟล์" : "กดซิงก์ (API)"}</td>
                <td className="p-3">{!l.finished_at ? "กำลังทำงาน…" : l.ok ? "สำเร็จ" : <span className="text-sale">ล้มเหลว: {l.error}</span>}</td>
                <td className="p-3 text-right">{l.checked}</td>
                <td className="p-3 text-right">{l.updated}</td>
                <td className="p-3 text-right">{l.missing ? l.missing.split(",").filter(Boolean).length : 0}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted">ยังไม่เคยซิงก์</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
