import { importCsv } from "../../actions";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">นำเข้าสินค้าจาก Google Sheet</h1>
      <ol className="card list-decimal space-y-1 p-6 pl-10 text-sm">
        <li>เปิดชีต “Website Brief - Mynds” แท็บ <b>03_Product_Master</b></li>
        <li>เมนู ไฟล์ → ดาวน์โหลด → <b>ค่าที่คั่นด้วยจุลภาค (.csv)</b></li>
        <li>อัปโหลดไฟล์ด้านล่าง — ระบบจะอัปเดตชื่อ หมวดหมู่ คำอธิบาย ราคา และรูป ตาม <b>รหัส Variant SKU</b></li>
      </ol>
      <p className="text-sm text-muted">สถานะเปิดขาย/ซ่อน และ “สินค้าแนะนำ” ที่ตั้งในหลังบ้านจะไม่ถูกเขียนทับ · คอลัมน์ต้นทุนจะไม่ถูกนำเข้า</p>
      {sp.ok && <p className="rounded-lg bg-ice-light p-3 text-sm text-ice-dark">{sp.ok}</p>}
      {sp.error && <p className="rounded-lg bg-sale/10 p-3 text-sm text-sale">{sp.error}</p>}
      <form action={importCsv} className="card flex flex-wrap items-center gap-3 p-6">
        <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
        <button className="btn-primary ml-auto">นำเข้า</button>
        <label className="flex w-full items-start gap-2 text-sm">
          <input type="checkbox" name="update_stock" value="1" className="mt-1" />
          <span>อัปเดต<b>จำนวนสต็อก</b>ตามชีตด้วย <span className="text-muted">— ปกติไม่ต้องติ๊ก เพราะสต็อกอัปเดตจาก JST (เมนู “สต็อก JST”) ถ้าติ๊ก ตัวเลขในชีตจะทับสต็อกปัจจุบัน · สินค้า/ไซซ์ใหม่จะใช้สต็อกจากชีตเสมอ</span></span>
        </label>
      </form>
    </div>
  );
}
