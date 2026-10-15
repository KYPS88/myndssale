import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts } from "@/lib/products";
import { saveProduct } from "../../../actions";

const CATEGORIES = ["เสื้อยืด", "เสื้อโปโล", "เสื้อแขนยาว", "เสื้อแขนกุด", "เสื้อเชิ้ต", "เสื้อคาร์ดิแกน", "เสื้อสเวตเตอร์", "กางเกง", "กระโปรง", "ของแถม"];

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const id = Number((await params).id);
  const p = getAllProducts({ includeHidden: true }).find((x) => x.id === id);
  if (!p) notFound();
  const { saved } = await searchParams;
  const T = ({ name, label, rows = 1, value }: { name: string; label: string; rows?: number; value: string | null }) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {rows > 1 ? <textarea id={name} name={name} rows={rows} defaultValue={value ?? ""} className="input" /> : <input id={name} name={name} defaultValue={value ?? ""} className="input" />}
    </div>
  );
  return (
    <form action={saveProduct} className="space-y-6">
      <input type="hidden" name="id" value={p.id} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{p.name}</h1>
        <span className="text-sm text-muted">{p.sku}</span>
        {p.status === "active" && <Link href={`/products/${p.slug}`} target="_blank" className="text-sm text-ice underline">ดูหน้าร้าน ↗</Link>}
        <button className="btn-primary ml-auto">บันทึก</button>
      </div>
      {saved && <p className="rounded-lg bg-ice-light p-3 text-sm text-ice-dark">บันทึกแล้ว</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <T name="name" label="ชื่อสินค้า" value={p.name} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="category">หมวดหมู่</label>
              <select id="category" name="category" defaultValue={p.category} className="input">{[...new Set([p.category, ...CATEGORIES])].map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label" htmlFor="gender">กลุ่ม</label>
              <select id="gender" name="gender" defaultValue={p.gender} className="input"><option value="UNISEX">Unisex</option><option value="WOMEN">ผู้หญิง</option><option value="KIDS">เด็ก</option></select></div>
            <T name="collection" label="คอลเลกชัน" value={p.collection} />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="status" value="active" defaultChecked={p.status === "active"} /> เปิดขาย</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="status" value="hidden" defaultChecked={p.status !== "active"} /> ซ่อน</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={!!p.featured} /> สินค้าแนะนำ (แสดงก่อน)</label>
          </div>
          <T name="short_description" label="คำอธิบายสั้น" value={p.short_description} />
          <T name="description" label="รายละเอียดสินค้า" rows={4} value={p.description} />
          <T name="features" label="จุดขาย/คุณสมบัติ" rows={3} value={p.features} />
        </div>
        <div className="card space-y-4 p-6">
          <T name="material" label="วัสดุ/ส่วนผสม" value={p.material} />
          <T name="fit" label="ทรง/ฟิต" value={p.fit} />
          <T name="care" label="วิธีดูแล" rows={2} value={p.care} />
          <T name="size_chart_url" label="ตารางไซซ์ (URL รูป)" value={p.size_chart_url} />
          <T name="seo_title" label="SEO Title" value={p.seo_title} />
          <T name="seo_description" label="Meta Description" rows={2} value={p.seo_description} />
        </div>
      </div>
      <div className="card overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead className="text-left"><tr><th className="p-2">Variant SKU</th><th className="p-2">สี</th><th className="p-2">ไซซ์</th><th className="p-2">ราคาขาย</th><th className="p-2">ราคาปกติ (ขีดฆ่า)</th><th className="p-2">สต็อก</th></tr></thead>
          <tbody>
            {p.variants.map((v) => (
              <tr key={v.id} className="border-t border-line">
                <td className="p-2 text-xs">{v.sku}</td><td className="p-2">{v.color}</td><td className="p-2">{v.size}</td>
                <td className="p-2"><input name={`v_${v.id}_price`} defaultValue={v.price} inputMode="decimal" className="input w-24 py-1.5" /></td>
                <td className="p-2"><input name={`v_${v.id}_compare`} defaultValue={v.compare_at ?? ""} inputMode="decimal" className="input w-24 py-1.5" /></td>
                <td className="p-2"><input name={`v_${v.id}_stock`} defaultValue={v.stock} inputMode="numeric" className="input w-20 py-1.5" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn-primary">บันทึก</button>
    </form>
  );
}
