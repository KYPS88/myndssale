import Link from "next/link";
import { getAllProducts, matchesQuery } from "@/lib/products";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const all = getAllProducts({ includeHidden: true }).filter(
    (p) => (!sp.q || matchesQuery(p, sp.q)) && (!sp.status || p.status === sp.status),
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">สินค้า ({all.length})</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} className="input max-w-xs bg-white" placeholder="ชื่อ / SKU" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto bg-white">
          <option value="">ทั้งหมด</option><option value="active">เปิดขาย</option><option value="hidden">ซ่อน</option>
        </select>
        <button className="btn-primary">ค้นหา</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left"><tr><th className="p-3">สินค้า</th><th className="p-3">หมวด</th><th className="p-3">ราคา</th><th className="p-3 text-right">สต็อกรวม</th><th className="p-3 text-right">ขายแล้ว</th><th className="p-3">สถานะ</th></tr></thead>
          <tbody>
            {all.map((p) => {
              const prices = p.variants.map((v) => v.price);
              const stock = p.variants.reduce((s, v) => s + v.stock, 0);
              const noPrice = p.variants.every((v) => v.price <= 0);
              return (
                <tr key={p.id} className="border-t border-line">
                  <td className="p-3"><Link href={`/admin/products/${p.id}`} className="font-medium text-ice underline">{p.name}</Link><br /><span className="text-xs text-muted">{p.sku} · {p.variants.length} variant</span></td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3 whitespace-nowrap">{noPrice ? <span className="text-sale">ยังไม่ตั้งราคา</span> : `฿${Math.min(...prices)}${Math.max(...prices) > Math.min(...prices) ? `–${Math.max(...prices)}` : ""}`}</td>
                  <td className="p-3 text-right">{stock.toLocaleString()}</td>
                  <td className="p-3 text-right">{p.sold_count}</td>
                  <td className="p-3">{p.status === "active" ? "เปิดขาย" : <span className="text-muted">ซ่อน</span>}{p.featured ? " ★" : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
