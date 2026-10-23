import { getSettings } from "@/lib/db";
import { jstConfigFromEnv } from "@/lib/jst";
import { recentSyncLogs, RESERVING_STATUSES } from "@/lib/stock-sync";
import { STATUS_LABEL } from "@/lib/orders";
import { runStockSync, testJstConnection } from "../../actions";

const time = (s: string | null) => (s ? new Date(s.replace(" ", "T") + "Z").toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "medium" }) : "—");

export default async function StockSync({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; tested?: string }> }) {
  const sp = await searchParams;
  const cfg = jstConfigFromEnv();
  const minutes = Number(process.env.JST_SYNC_MINUTES ?? 10);
  const logs = recentSyncLogs();
  const lastTest = getSettings().jst_last_test;
  const lastMissing = logs.find((l) => l.ok)?.missing?.split(",").filter(Boolean) ?? [];
  const env = (k: string) => (process.env[k]?.trim() ? "✓ ตั้งแล้ว" : "✗ ยังไม่ได้ตั้ง");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">ซิงก์สต็อกกับ JST</h1>
      {sp.ok && <p className="rounded-lg bg-ice-light p-3 text-sm text-ice-dark">{sp.ok}</p>}
      {sp.error && <p className="rounded-lg bg-sale/10 p-3 text-sm text-sale">{sp.error}</p>}

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
                <td className="p-3">{l.trigger === "auto" ? "อัตโนมัติ" : "กดเอง"}</td>
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
