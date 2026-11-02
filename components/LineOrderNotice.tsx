import Link from "next/link";
import { site } from "@/lib/site";
import { LineIcon } from "./icons";

// แสดงแทนตะกร้า/หน้าชำระเงิน เมื่อปิดสั่งซื้อผ่านเว็บ (หลังบ้าน › ตั้งค่าร้าน)
export function LineOrderNotice() {
  return (
    <div className="container-x py-16">
      <div className="card mx-auto max-w-lg space-y-5 p-8 text-center">
        <h1 className="text-2xl font-semibold">สั่งซื้อผ่าน LINE</h1>
        <p className="text-muted">
          ตอนนี้ร้านรับคำสั่งซื้อทาง LINE {site.contact.lineId} — แจ้งชื่อสินค้า สี ไซซ์ และจำนวน แอดมินจะยืนยันยอดและค่าส่งให้ในแชท
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={site.contact.lineQr} alt="QR Code แอดไลน์ Mynds" width={180} height={180} className="mx-auto hidden h-44 w-44 md:block" />
        <a href={site.contact.lineUrl} target="_blank" rel="noopener" data-line="cart-page" className="btn inline-flex bg-[#06c755] px-7 py-3 text-white hover:opacity-90">
          <LineIcon /> แอดไลน์ {site.contact.lineId}
        </a>
        <p><Link href="/products" className="text-sm text-ice underline">เลือกดูสินค้าต่อ</Link></p>
      </div>
    </div>
  );
}
