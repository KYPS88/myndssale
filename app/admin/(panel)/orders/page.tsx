import Link from "next/link";
import { listOrders, ORDER_STATUSES, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/orders";
import { formatBaht } from "@/lib/site";

export default async function Orders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { total, rows } = listOrders({ q: sp.q, status: sp.status, from: sp.from, to: sp.to, limit: 50, offset: (page - 1) * 50 });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">คำสั่งซื้อ ({total})</h1>
        <a
          href={`/admin/orders/export?${new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, from: sp.from, to: sp.to }).filter(([, v]) => v) as [string, string][])}`}
          className="btn-outline ml-auto bg-white"
        >
          ⬇ Export CSV {total ? `(${total} ออเดอร์)` : ""}
        </a>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} className="input max-w-xs bg-white" placeholder="เลขออเดอร์ / ชื่อ / เบอร์ / เลขพัสดุ" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto bg-white">
          <option value="">ทุกสถานะ</option>
          {ORDER_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm">ตั้งแต่<input type="date" name="from" defaultValue={sp.from} className="input w-auto bg-white" /></label>
        <label className="flex items-center gap-1 text-sm">ถึง<input type="date" name="to" defaultValue={sp.to} className="input w-auto bg-white" /></label>
        <button className="btn-primary">ค้นหา</button>
      </form>
      <p className="text-xs text-muted">Export จะได้ไฟล์ CSV เปิดด้วย Excel / Google Sheets ได้ · 1 แถวต่อ 1 รายการสินค้า · ยอดเงินของออเดอร์อยู่ที่แถวแรกของแต่ละออเดอร์</p>
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
