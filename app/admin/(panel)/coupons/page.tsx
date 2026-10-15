import { getDb } from "@/lib/db";
import type { Coupon } from "@/lib/pricing";
import { deleteCoupon, saveCoupon } from "../../actions";

export default async function Coupons({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const rows = getDb().prepare("SELECT * FROM coupons ORDER BY code").all() as (Coupon & { description: string | null })[];
  const typeLabel = { percent: "ลด %", fixed: "ลดเป็นบาท", free_shipping: "ส่งฟรี" };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">คูปองส่วนลด</h1>
      {sp.saved && <p className="rounded-lg bg-ice-light p-3 text-sm text-ice-dark">บันทึกแล้ว</p>}
      {sp.error && <p className="rounded-lg bg-sale/10 p-3 text-sm text-sale">ข้อมูลไม่ถูกต้อง (โค้ดใช้ A-Z, 0-9, - หรือ _ ความยาว 3–40)</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left"><tr><th className="p-3">โค้ด</th><th className="p-3">ประเภท</th><th className="p-3">มูลค่า</th><th className="p-3">ขั้นต่ำ</th><th className="p-3">ช่วงเวลา</th><th className="p-3">ใช้แล้ว</th><th className="p-3">สถานะ</th><th /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.code} className="border-t border-line">
                <td className="p-3 font-medium">{c.code}<br /><span className="text-xs text-muted">{c.description}</span></td>
                <td className="p-3">{typeLabel[c.type]}</td>
                <td className="p-3">{c.type === "percent" ? `${c.value}%${c.max_discount ? ` (สูงสุด ฿${c.max_discount})` : ""}` : c.type === "fixed" ? `฿${c.value}` : "-"}</td>
                <td className="p-3">฿{c.min_subtotal}</td>
                <td className="p-3 text-xs">{c.starts_at ?? "—"} → {c.ends_at ?? "—"}</td>
                <td className="p-3">{c.used_count}{c.usage_limit != null ? ` / ${c.usage_limit}` : ""}</td>
                <td className="p-3">{c.active ? "ใช้งาน" : "ปิด"}</td>
                <td className="p-3"><form action={deleteCoupon}><input type="hidden" name="code" value={c.code} /><button className="text-xs text-sale underline">ลบ</button></form></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted">ยังไม่มีคูปอง</td></tr>}
          </tbody>
        </table>
      </div>
      <form action={saveCoupon} className="card grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="font-semibold sm:col-span-2 lg:col-span-4">เพิ่ม / แก้ไขคูปอง (ใส่โค้ดเดิมเพื่อแก้ไข)</h2>
        <div><label className="label">โค้ด</label><input name="code" className="input uppercase" required /></div>
        <div><label className="label">ประเภท</label><select name="type" className="input"><option value="percent">ลด %</option><option value="fixed">ลดเป็นบาท</option><option value="free_shipping">ส่งฟรี</option></select></div>
        <div><label className="label">มูลค่า</label><input name="value" inputMode="decimal" className="input" defaultValue="0" /></div>
        <div><label className="label">ส่วนลดสูงสุด (บาท)</label><input name="max_discount" inputMode="decimal" className="input" /></div>
        <div><label className="label">ยอดขั้นต่ำ (บาท)</label><input name="min_subtotal" inputMode="decimal" className="input" defaultValue="0" /></div>
        <div><label className="label">เริ่ม</label><input name="starts_at" type="datetime-local" className="input" /></div>
        <div><label className="label">สิ้นสุด</label><input name="ends_at" type="datetime-local" className="input" /></div>
        <div><label className="label">จำกัดจำนวนครั้ง</label><input name="usage_limit" inputMode="numeric" className="input" /></div>
        <div className="sm:col-span-2"><label className="label">คำอธิบาย (ภายใน)</label><input name="description" className="input" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> เปิดใช้งาน</label>
        <div className="flex items-end"><button className="btn-primary w-full">บันทึกคูปอง</button></div>
      </form>
    </div>
  );
}
