import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "วิธีเลือกไซซ์" };

// ค่าประมาณสำหรับเสื้อยืดทรงปกติ — แทนที่ด้วยตารางไซซ์จริงของแต่ละรุ่น (คอลัมน์ "ตารางไซซ์ URL" ในชีต)
const ROWS = [
  ["XS", "34", "25"], ["S", "36", "26"], ["M", "38", "27"], ["L", "40", "28"], ["XL", "42", "29"],
  ["2XL", "44", "30"], ["3XL", "46", "31"], ["4XL", "48", "32"], ["5XL", "50", "32.5"], ["6XL", "52", "33"],
];

export default function SizeGuide() {
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="text-3xl font-semibold">วิธีเลือกไซซ์</h1>
      <p className="mt-2 text-sm text-muted">วัดรอบอกเสื้อตัวที่ใส่สบายที่สุดของคุณ แล้วเทียบกับตาราง (หน่วยนิ้ว) — ขนาดอาจต่างกันในแต่ละรุ่น ±1 นิ้ว ดูตารางเฉพาะรุ่นได้ในหน้าสินค้า</p>
      <table className="mt-6 w-full overflow-hidden rounded-xl border border-line text-center text-sm">
        <thead className="bg-soft"><tr><th className="p-3">ไซซ์</th><th className="p-3">รอบอก (นิ้ว)</th><th className="p-3">ความยาว (นิ้ว)</th></tr></thead>
        <tbody>
          {ROWS.map(([s, c, l]) => <tr key={s} className="border-t border-line"><td className="p-3 font-medium">{s}</td><td className="p-3">{c}</td><td className="p-3">{l}</td></tr>)}
        </tbody>
      </table>
      <p className="mt-6 text-sm">ไม่แน่ใจไซซ์? ส่งส่วนสูง/น้ำหนักให้แอดมินช่วยเลือกทาง LINE <a href={site.contact.lineUrl} className="font-semibold text-[#06a648] underline">{site.contact.lineId}</a></p>
    </div>
  );
}
