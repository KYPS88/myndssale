import Link from "next/link";
import { listOrders, ORDER_STATUSES, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/orders";
import { formatBaht } from "@/lib/site";

export default async function Orders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { total, rows } = listOrders({ q: sp.q, status: sp.status, limit: 50, offset: (page - 1) * 50 });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">คำสั่งซื้อ ({total})</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} className="input max-w-xs bg-white" placeholder="เลขออเดอร์ / ชื่อ / เบอร์ / เลขพัสดุ" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto bg-white">
          <option value="">ทุกสถานะ</option>
          {ORDER_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button className="btn-primary">ค้นหา</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left"><tr><th className="p-3">เลขที่</th><th className="p-3">วันที่</th><th className="p-3">ลูกค้า</th><th className="p-3">ชำระ</th><th className="p-3 text-right">ยอด</th><th className="p-3">สถานะ</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="p-3"><Link className="font-medium text-ice underline" href={`/admin/orders/${o.order_no}`}>{o.order_no}</Link></td>
                <td className="p-3 whitespace-nowrap">{new Date(o.created_at + "Z").toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3">{o.customer_name}<br /><span className="text-xs text-muted">{o.phone}</span></td>
                <td className="p-3 text-xs">{PAYMENT_LABEL[o.payment_method]}</td>
                <td className="p-3 text-right">{formatBaht(o.total)}</td>
                <td className="p-3">{STATUS_LABEL[o.status]}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted">ไม่พบคำสั่งซื้อ</td></tr>}
          </tbody>
        </table>
      </div>
      {total > 50 && (
        <div className="flex gap-2">
          {page > 1 && <Link className="btn-outline" href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}>ก่อนหน้า</Link>}
          {page * 50 < total && <Link className="btn-outline" href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}>ถัดไป</Link>}
        </div>
      )}
    </div>
  );
}
