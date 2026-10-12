import { notFound } from "next/navigation";
import { getOrder, ORDER_STATUSES, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/orders";
import { formatBaht } from "@/lib/site";
import { saveOrder } from "../../../actions";

const CARRIERS = ["Flash Express", "Kerry Express", "J&T Express", "ไปรษณีย์ไทย", "Thailand Post EMS", "Best Express", "Ninja Van", "SPX Express"];

export default async function OrderAdmin({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<{ saved?: string }> }) {
  const o = getOrder((await params).no);
  if (!o) notFound();
  const { saved } = await searchParams;
  const time = (s: string) => new Date(s + "Z").toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl font-semibold">{o.order_no}</h1>
            <span className="rounded-full bg-ice-light px-3 py-1 text-sm text-ice-dark">{STATUS_LABEL[o.status]}</span>
          </div>
          <p className="text-sm text-muted">{time(o.created_at)} · {PAYMENT_LABEL[o.payment_method]}</p>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id} className="border-t border-line">
                  <td className="py-2">{i.name}<br /><span className="text-xs text-muted">{i.sku} · {i.color}/{i.size}</span></td>
                  <td className="py-2 text-center">× {i.qty}</td>
                  <td className="py-2 text-right">{formatBaht(i.price * i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>สินค้า</dt><dd>{formatBaht(o.subtotal)}</dd></div>
            {o.discount > 0 && <div className="flex justify-between"><dt>ส่วนลด ({o.coupon_code})</dt><dd>-{formatBaht(o.discount)}</dd></div>}
            <div className="flex justify-between"><dt>ค่าส่ง</dt><dd>{formatBaht(o.shipping)}</dd></div>
            {o.cod_fee > 0 && <div className="flex justify-between"><dt>ค่าธรรมเนียม COD</dt><dd>{formatBaht(o.cod_fee)}</dd></div>}
            <div className="flex justify-between font-semibold"><dt>รวม</dt><dd>{formatBaht(o.total)}</dd></div>
          </dl>
        </div>
        <div className="card grid gap-4 p-6 text-sm sm:grid-cols-2">
          <div>
            <h2 className="font-semibold">ลูกค้า / ที่อยู่จัดส่ง</h2>
            <p className="mt-1">{o.customer_name}<br />{o.phone}{o.email ? <><br />{o.email}</> : null}</p>
            <p className="mt-1 text-muted">{[o.address, o.subdistrict, o.district, o.province, o.postcode].filter(Boolean).join(" ")}</p>
            {o.marketing_consent ? <p className="mt-1 text-xs text-ice-dark">✓ ยินยอมรับข่าวสาร</p> : null}
          </div>
          <div>
            {o.note && <><h2 className="font-semibold">หมายเหตุลูกค้า</h2><p className="mt-1">{o.note}</p></>}
            {o.tax_invoice && <><h2 className="mt-3 font-semibold">ข้อมูลใบกำกับภาษี</h2><p className="mt-1 whitespace-pre-line">{o.tax_invoice}</p></>}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="mb-2 font-semibold">ประวัติสถานะ</h2>
          <ul className="space-y-1 text-sm">
            {o.events.map((e, i) => <li key={i}>{time(e.created_at)} — <b>{STATUS_LABEL[e.status] ?? e.status}</b>{e.note ? ` · ${e.note}` : ""}</li>)}
          </ul>
        </div>
      </div>
      <form action={saveOrder} className="card h-fit space-y-4 p-6">
        <input type="hidden" name="orderNo" value={o.order_no} />
        {saved && <p className="rounded-lg bg-ice-light p-2 text-sm text-ice-dark">บันทึกแล้ว</p>}
        <div>
          <label className="label" htmlFor="status">สถานะ</label>
          <select id="status" name="status" defaultValue={o.status} className="input">
            {ORDER_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">ยกเลิก/คืนเงิน = คืนสต็อกอัตโนมัติ</p>
        </div>
        <div><label className="label" htmlFor="eventNote">หมายเหตุการเปลี่ยนสถานะ</label><input id="eventNote" name="eventNote" className="input" placeholder="เช่น ตรวจสลิปแล้ว" /></div>
        <div>
          <label className="label" htmlFor="carrier">ขนส่ง</label>
          <input id="carrier" name="carrier" list="carriers" defaultValue={o.carrier ?? ""} className="input" />
          <datalist id="carriers">{CARRIERS.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div><label className="label" htmlFor="trackingNo">เลขพัสดุ</label><input id="trackingNo" name="trackingNo" defaultValue={o.tracking_no ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="adminNote">โน้ตภายใน</label><textarea id="adminNote" name="adminNote" defaultValue={o.admin_note ?? ""} rows={3} className="input" /></div>
        <button className="btn-primary w-full">บันทึก</button>
      </form>
    </div>
  );
}
