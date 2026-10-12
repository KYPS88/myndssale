import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { site } from "@/lib/site";
import { LineIcon } from "@/components/icons";

export const metadata: Metadata = { title: "คำถามที่พบบ่อย / ติดต่อเรา", description: "คำถามที่พบบ่อยเกี่ยวกับการสั่งซื้อ การจัดส่ง การชำระเงิน และการเปลี่ยนสินค้า Mynds" };

export default function FaqPage() {
  const s = getSettings();
  const faqs: [string, string][] = [
    ["ต้องสมัครสมาชิกก่อนสั่งซื้อไหม?", "ไม่ต้องครับ สามารถสั่งซื้อได้ทันทีด้วยชื่อ เบอร์โทร และที่อยู่จัดส่ง และติดตามสถานะได้จากหน้า “ติดตามคำสั่งซื้อ”"],
    ["ชำระเงินได้ช่องทางไหนบ้าง?", `โอนเงิน/สแกน PromptPay${s.cod_enabled === "1" ? ", เก็บเงินปลายทาง (COD)" : ""}${s.card_enabled === "1" ? " และบัตรเครดิต/เดบิต" : " (บัตรเครดิต/เดบิต เปิดให้บริการเร็ว ๆ นี้)"}`],
    ["ค่าจัดส่งเท่าไร?", `ค่าจัดส่ง ฿${s.shipping_flat} ทั่วประเทศ${Number(s.free_shipping_min) > 0 ? ` และส่งฟรีเมื่อช้อปครบ ฿${Number(s.free_shipping_min).toLocaleString("th-TH")}` : ""}`],
    ["ได้รับสินค้ากี่วัน?", s.shipping_note],
    ["เลือกไซซ์อย่างไร?", "ดูตารางไซซ์ในหน้าสินค้า หรือหน้า “วิธีเลือกไซซ์” หากไม่แน่ใจทักแอดมินทาง LINE ได้เลย"],
    ["เปลี่ยนไซซ์ได้ไหม?", "เปลี่ยนไซซ์ได้ภายใน 7 วันหลังได้รับสินค้า สินค้าต้องไม่ผ่านการใช้งานและป้ายยังอยู่ครบ รายละเอียดดูที่นโยบายการเปลี่ยน/คืนสินค้า"],
    ["ต้องการใบกำกับภาษี?", "เลือก “ต้องการใบกำกับภาษีเต็มรูป” ในหน้าชำระเงิน แล้วกรอกข้อมูลผู้เสียภาษี"],
  ];
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="text-3xl font-semibold">คำถามที่พบบ่อย</h1>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {faqs.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none justify-between font-medium">{q}<span className="transition group-open:rotate-45">+</span></summary>
            <p className="mt-2 text-sm leading-7 text-ink/80">{a}</p>
          </details>
        ))}
      </div>
      <h2 id="contact" className="mt-14 text-2xl font-semibold">ติดต่อเรา</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <a href={site.contact.lineUrl} target="_blank" rel="noopener" className="card flex items-center gap-3 p-5 hover:border-[#06c755]">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#06c755] text-white"><LineIcon /></span>
          <span><span className="block font-medium">LINE Official</span><span className="text-sm text-muted">{site.contact.lineId} · {site.contact.hours}</span></span>
        </a>
        <div className="card p-5 text-sm">
          <p className="font-medium">{site.company.name}</p>
          <p className="mt-1 text-muted">{site.company.address}</p>
        </div>
      </div>
    </div>
  );
}
