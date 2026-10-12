import Link from "next/link";
import { getDb } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/orders";
import { formatBaht } from "@/lib/site";

export default function Dashboard() {
  const db = getDb();
  const one = <T,>(sql: string, ...a: (string | number)[]) => db.prepare(sql).get(...a) as T;
  const today = one<{ n: number; s: number }>("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE date(created_at,'+7 hours') = date('now','+7 hours') AND status NOT IN ('cancelled','refunded')");
  const month = one<{ n: number; s: number }>("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE strftime('%Y-%m',created_at,'+7 hours') = strftime('%Y-%m','now','+7 hours') AND status NOT IN ('cancelled','refunded')");
  const byStatus = db.prepare("SELECT status, COUNT(*) n FROM orders GROUP BY status").all() as { status: string; n: number }[];
  const low = db.prepare(`SELECT v.sku, v.color, v.size, v.stock, p.name, p.id FROM variants v JOIN products p ON p.id=v.product_id
    WHERE p.status='active' AND v.price > 0 AND v.stock <= 3 ORDER BY v.stock, p.name LIMIT 15`).all() as { sku: string; color: string; size: string; stock: number; name: string; id: number }[];
  const restock = one<{ n: number }>("SELECT COUNT(*) n FROM restock_requests WHERE notified = 0");
  const products = one<{ a: number; h: number }>("SELECT SUM(status='active') a, SUM(status!='active') h FROM products");

  const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="card p-5"><p className="text-sm text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p>{sub && <p className="text-xs text-muted">{sub}</p>}</div>
  );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">ภาพรวม</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="ยอดขายวันนี้" value={formatBaht(today.s)} sub={`${today.n} คำสั่งซื้อ`} />
        <Stat label="ยอดขายเดือนนี้" value={formatBaht(month.s)} sub={`${month.n} คำสั่งซื้อ`} />
        <Stat label="สินค้าที่เปิดขาย" value={String(products.a ?? 0)} sub={`ซ่อนอยู่ ${products.h ?? 0} รายการ`} />
        <Stat label="ขอแจ้งเตือนสินค้าเข้า" value={String(restock.n)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">คำสั่งซื้อตามสถานะ</h2>
          <ul className="space-y-2 text-sm">
            {byStatus.length === 0 && <li className="text-muted">ยังไม่มีคำสั่งซื้อ</li>}
            {byStatus.map((s) => (
              <li key={s.status} className="flex justify-between"><Link href={`/admin/orders?status=${s.status}`} className="underline">{STATUS_LABEL[s.status] ?? s.status}</Link><span>{s.n}</span></li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">สต็อกใกล้หมด (≤ 3)</h2>
          <ul className="space-y-1 text-sm">
            {low.map((v) => (
              <li key={v.sku} className="flex justify-between gap-2"><Link href={`/admin/products/${v.id}`} className="line-clamp-1 underline">{v.name} · {v.color}/{v.size}</Link><span className={v.stock === 0 ? "text-sale" : ""}>{v.stock}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
