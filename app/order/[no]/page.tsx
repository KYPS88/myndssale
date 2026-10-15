import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/orders";
import { verifyOrderToken } from "@/lib/order-token";
import { getSettings } from "@/lib/db";
import { formatBaht, site } from "@/lib/site";
import { PurchaseEvent } from "./PurchaseEvent";
import { Img } from "@/components/Img";

export const metadata: Metadata = { title: "สถานะคำสั่งซื้อ", robots: { index: false } };

const STEPS = ["pending_payment", "paid", "processing", "shipped", "completed"];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<{ t?: string; new?: string }> }) {
  const { no } = await params;
  const { t, new: isNew } = await searchParams;
  if (!verifyOrderToken(no, t)) notFound();
  const o = getOrder(no);
  if (!o) notFound();
  const s = getSettings();
  const stepIndex = o.payment_method === "cod" && o.status === "processing" ? 2 : STEPS.indexOf(o.status);

  return (
    <div className="container-x max-w-3xl py-10">
      {isNew && (
        <PurchaseEvent
          orderNo={o.order_no}
          value={o.total}
          shipping={o.shipping}
          coupon={o.coupon_code}
          items={o.items.map((i) => ({ item_id: i.sku, item_name: i.name, price: i.price, quantity: i.qty, item_variant: `${i.color}/${i.size}` }))}
        />
      )}
      <div className="text-center">
        {isNew && <p className="text-4xl">✅</p>}
        <h1 className="mt-2 text-2xl font-semibold">{isNew ? "ขอบคุณสำหรับคำสั่งซื้อ" : "สถานะคำสั่งซื้อ"}</h1>
        <p className="mt-1 text-muted">หมายเลขคำสั่งซื้อ <b className="text-ink">{o.order_no}</b></p>
        <p className="mt-1 text-xs text-muted">บันทึกลิงก์หน้านี้ไว้เพื่อติดตามสถานะ หรือค้นหาได้ที่ <Link href="/track" className="underline">ติดตามคำสั่งซื้อ</Link></p>
      </div>

      {o.status === "cancelled" || o.status === "refunded" ? (
        <p className="mt-8 rounded-xl bg-soft p-4 text-center font-medium">{STATUS_LABEL[o.status]}</p>
      ) : (
        <ol className="mt-8 grid grid-cols-5 gap-1 text-center text-[11px] sm:text-xs">
          {STEPS.map((st, i) => (
            <li key={st} className={i <= stepIndex ? "text-ink" : "text-muted"}>
              <div className={`mb-2 h-1.5 rounded-full ${i <= stepIndex ? "bg-ice" : "bg-line"}`} />
              {o.payment_method === "cod" && st === "pending_payment" ? "สั่งซื้อแล้ว" : o.payment_method === "cod" && st === "paid" ? "ยืนยันแล้ว" : STATUS_LABEL[st]}
            </li>
          ))}
        </ol>
      )}

      {o.status === "pending_payment" && o.payment_method === "transfer" && (
        <section className="card mt-8 space-y-3 p-6">
          <h2 className="text-lg font-semibold">ชำระเงิน {formatBaht(o.total)}</h2>
          {s.promptpay_id && (
            <Img src={`https://promptpay.io/${encodeURIComponent(s.promptpay_id)}/${o.total}.png`} alt="PromptPay QR" className="mx-auto h-56 w-56" />
          )}
          {s.bank_account_no ? (
            <p className="text-sm">
              {s.bank_name} เลขที่บัญชี <b>{s.bank_account_no}</b><br />ชื่อบัญชี {s.bank_account_name}
            </p>
          ) : !s.promptpay_id ? (
            <p className="text-sm text-muted">ทีมงานจะส่งช่องทางชำระเงินให้ทาง LINE / โทรศัพท์</p>
          ) : null}
          <p className="text-sm">
            หลังโอนแล้ว กรุณาส่งสลิปพร้อมหมายเลขคำสั่งซื้อ <b>{o.order_no}</b> ทาง LINE{" "}
            <a href={site.contact.lineUrl} target="_blank" rel="noopener" className="font-semibold text-[#06a648] underline">{site.contact.lineId}</a>
          </p>
        </section>
      )}
      {o.status === "pending_payment" && o.payment_method === "card" && (
        <p className="card mt-8 p-6 text-sm">ทีมงานจะส่งลิงก์ชำระเงินด้วยบัตรให้ทาง LINE / SMS ภายในเวลาทำการ</p>
      )}
      {o.tracking_no && (
        <section className="card mt-8 p-6">
          <h2 className="font-semibold">ข้อมูลการจัดส่ง</h2>
          <p className="mt-1 text-sm">{o.carrier ?? "ขนส่ง"} · เลขพัสดุ <b>{o.tracking_no}</b></p>
        </section>
      )}

      <section className="card mt-8 p-6">
        <h2 className="mb-4 font-semibold">รายการสินค้า</h2>
        <ul className="space-y-3">
          {o.items.map((i) => (
            <li key={i.id} className="flex gap-3 text-sm">
              <Img src={i.image} alt="" className="h-16 w-12 rounded bg-soft object-cover" />
              <div className="flex-1"><p>{i.name}</p><p className="text-xs text-muted">{i.color} / {i.size} × {i.qty}</p></div>
              <span>{formatBaht(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>ยอดรวมสินค้า</dt><dd>{formatBaht(o.subtotal)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between text-sale"><dt>ส่วนลด {o.coupon_code}</dt><dd>-{formatBaht(o.discount)}</dd></div>}
          <div className="flex justify-between"><dt>ค่าจัดส่ง</dt><dd>{o.shipping ? formatBaht(o.shipping) : "ฟรี"}</dd></div>
          {o.cod_fee > 0 && <div className="flex justify-between"><dt>ค่าธรรมเนียม COD</dt><dd>{formatBaht(o.cod_fee)}</dd></div>}
          <div className="flex justify-between pt-2 text-base font-semibold"><dt>ยอดรวม</dt><dd>{formatBaht(o.total)}</dd></div>
        </dl>
      </section>

      <section className="card mt-8 grid gap-4 p-6 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-1 font-semibold">จัดส่งถึง</h2>
          <p>{o.customer_name} · {o.phone}</p>
          <p className="text-muted">{[o.address, o.subdistrict, o.district, o.province, o.postcode].filter(Boolean).join(" ")}</p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold">วิธีชำระเงิน</h2>
          <p>{PAYMENT_LABEL[o.payment_method]}</p>
        </div>
      </section>
      <div className="mt-8 text-center"><Link href="/products" className="btn-outline">เลือกซื้อสินค้าต่อ</Link></div>
    </div>
  );
}
