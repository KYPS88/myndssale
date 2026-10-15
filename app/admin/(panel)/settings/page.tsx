import { getSettings } from "@/lib/db";
import { saveSettings } from "../../actions";

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const s = getSettings();
  const { saved } = await searchParams;
  const F = ({ k, label, hint }: { k: string; label: string; hint?: string }) => (
    <div><label className="label" htmlFor={k}>{label}</label><input id={k} name={k} defaultValue={s[k]} className="input" />{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>
  );
  return (
    <form action={saveSettings} className="space-y-6">
      <div className="flex items-center"><h1 className="text-2xl font-semibold">ตั้งค่าร้าน</h1><button className="btn-primary ml-auto">บันทึก</button></div>
      {saved && <p className="rounded-lg bg-ice-light p-3 text-sm text-ice-dark">บันทึกแล้ว</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">การจัดส่ง</h2>
          <F k="shipping_flat" label="ค่าส่งเหมาจ่าย (บาท)" />
          <F k="free_shipping_min" label="ส่งฟรีเมื่อยอดซื้อถึง (บาท)" hint="ใส่ 0 = ไม่มีส่งฟรี" />
          <F k="shipping_note" label="ข้อความระยะเวลาจัดส่ง / ตัดรอบ" />
          <F k="announcement" label="ข้อความแถบประกาศด้านบน" hint="เว้นว่างเพื่อซ่อน" />
        </div>
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">การชำระเงิน</h2>
          <F k="promptpay_id" label="PromptPay (เบอร์โทร/เลขประจำตัวผู้เสียภาษี)" hint="ใส่แล้วหน้าออเดอร์จะแสดง QR พร้อมยอดเงิน" />
          <F k="bank_name" label="ธนาคาร" />
          <F k="bank_account_no" label="เลขที่บัญชี" />
          <F k="bank_account_name" label="ชื่อบัญชี" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cod_enabled" defaultChecked={s.cod_enabled === "1"} /> เปิดเก็บเงินปลายทาง (COD)</label>
          <F k="cod_fee" label="ค่าธรรมเนียม COD (บาท)" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="card_enabled" defaultChecked={s.card_enabled === "1"} /> เปิดรับบัตรเครดิต (ทีมงานส่งลิงก์ชำระให้ลูกค้า จนกว่าจะเชื่อม payment gateway)</label>
        </div>
      </div>
    </form>
  );
}
