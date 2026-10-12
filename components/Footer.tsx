import Link from "next/link";
import { site } from "@/lib/site";
import { LineIcon } from "./icons";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-soft">
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="text-xl font-bold tracking-[0.2em]">MYNDS</div>
          <p className="text-sm text-muted">{site.positioning}</p>
          <a href={site.contact.lineUrl} target="_blank" rel="noopener" className="btn inline-flex bg-[#06c755] text-white hover:opacity-90">
            <LineIcon /> LINE {site.contact.lineId}
          </a>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">ช้อปปิ้ง</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/products">สินค้าทั้งหมด</Link></li>
            <li><Link href="/products?sort=newest">สินค้าใหม่</Link></li>
            <li><Link href="/products?sort=popular">สินค้าขายดี</Link></li>
            <li><Link href="/products?sale=1">Sale</Link></li>
            <li><Link href="/size-guide">วิธีเลือกไซซ์</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">ช่วยเหลือ</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/track">ติดตามคำสั่งซื้อ</Link></li>
            <li><Link href="/faq">คำถามที่พบบ่อย / ติดต่อเรา</Link></li>
            <li><Link href="/policies/shipping">การจัดส่ง</Link></li>
            <li><Link href="/policies/returns">การเปลี่ยน/คืนสินค้า</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">เกี่ยวกับเรา</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/about">เรื่องราวของ Mynds</Link></li>
            <li><Link href="/policies/terms">ข้อกำหนดและเงื่อนไข</Link></li>
            <li><Link href="/policies/privacy">นโยบายความเป็นส่วนตัว</Link></li>
            <li><Link href="/policies/cookies">นโยบายคุกกี้</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x space-y-1 py-5 text-xs text-muted">
          <p>{site.company.name} · เลขประจำตัวผู้เสียภาษี {site.company.taxId}</p>
          <p>{site.company.address}</p>
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
