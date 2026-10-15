"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useCartQuote } from "@/components/useCartQuote";
import { Summary } from "@/components/Summary";
import { track } from "@/components/analytics";
import { PROVINCES } from "@/lib/provinces";
import { Img } from "@/components/Img";

type Form = {
  name: string; phone: string; email: string; address: string; subdistrict: string; district: string;
  province: string; postcode: string; note: string; wantTax: boolean; taxInvoice: string;
};

export function CheckoutForm({ initialCoupon }: { initialCoupon: string }) {
  const router = useRouter();
  const { lines, ready, clear } = useCart();
  const [form, setForm] = useState<Form>({ name: "", phone: "", email: "", address: "", subdistrict: "", district: "", province: "", postcode: "", note: "", wantTax: false, taxInvoice: "" });
  const [payment, setPayment] = useState<"transfer" | "cod" | "card">("transfer");
  const [coupon, setCoupon] = useState(initialCoupon);
  const [applied, setApplied] = useState(initialCoupon);
  const [terms, setTerms] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const placed = useRef(false);
  const { quote, loading } = useCartQuote(applied, payment);

  useEffect(() => {
    if (ready && lines.length && quote) {
      track("begin_checkout", { value: quote.totals.total, items: lines.map((l) => ({ item_id: l.sku, item_name: l.name, price: l.price, quantity: l.qty, item_variant: `${l.color}/${l.size}` })) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, !!quote]);

  if (ready && lines.length === 0 && !placed.current) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-2xl font-semibold">ไม่มีสินค้าในตะกร้า</h1>
        <Link href="/products" className="btn-primary mt-6">เลือกซื้อสินค้า</Link>
      </div>
    );
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const err = (field: string) => (error?.field === field ? <p className="mt-1 text-xs text-sale">{error.message}</p> : null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          customer: { ...form, taxInvoice: form.wantTax ? form.taxInvoice : "" },
          paymentMethod: payment,
          couponCode: applied || undefined,
          marketingConsent: consent,
          acceptTerms: terms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error ?? "สั่งซื้อไม่สำเร็จ", field: data.field });
        return;
      }
      placed.current = true;
      clear();
      router.push(`/order/${data.orderNo}?t=${data.token}&new=1`);
    } catch {
      setError({ message: "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่" });
    } finally {
      setSubmitting(false);
    }
  };

  const PayOption = ({ value, title, desc, disabled }: { value: typeof payment; title: string; desc: string; disabled?: boolean }) => (
    <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${payment === value ? "border-ink" : "border-line"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
      <input type="radio" name="payment" className="mt-1 accent-ink" checked={payment === value} disabled={disabled} onChange={() => setPayment(value)} />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-sm text-muted">{desc}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} className="container-x py-10" noValidate>
      <h1 className="text-3xl font-semibold">ชำระเงิน</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <fieldset className="space-y-4">
            <legend className="mb-2 text-lg font-semibold">ข้อมูลผู้รับ</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="name">ชื่อ-นามสกุล *</label><input id="name" className="input" autoComplete="name" value={form.name} onChange={set("name")} required />{err("name")}</div>
              <div><label className="label" htmlFor="phone">เบอร์โทรศัพท์ *</label><input id="phone" className="input" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} required />{err("phone")}</div>
            </div>
            <div><label className="label" htmlFor="email">อีเมล (สำหรับรับใบยืนยันคำสั่งซื้อ)</label><input id="email" type="email" className="input" autoComplete="email" value={form.email} onChange={set("email")} />{err("email")}</div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-2 text-lg font-semibold">ที่อยู่จัดส่ง</legend>
            <div><label className="label" htmlFor="address">บ้านเลขที่ / หมู่บ้าน / ถนน *</label><textarea id="address" rows={2} className="input" autoComplete="street-address" value={form.address} onChange={set("address")} required />{err("address")}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="subdistrict">แขวง / ตำบล</label><input id="subdistrict" className="input" value={form.subdistrict} onChange={set("subdistrict")} /></div>
              <div><label className="label" htmlFor="district">เขต / อำเภอ</label><input id="district" className="input" value={form.district} onChange={set("district")} /></div>
              <div>
                <label className="label" htmlFor="province">จังหวัด *</label>
                <select id="province" className="input" value={form.province} onChange={set("province")} required>
                  <option value="">เลือกจังหวัด</option>
                  {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </select>
                {err("province")}
              </div>
              <div><label className="label" htmlFor="postcode">รหัสไปรษณีย์ *</label><input id="postcode" className="input" inputMode="numeric" maxLength={5} autoComplete="postal-code" value={form.postcode} onChange={set("postcode")} required />{err("postcode")}</div>
            </div>
            <div><label className="label" htmlFor="note">หมายเหตุถึงร้าน</label><input id="note" className="input" value={form.note} onChange={set("note")} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-ink" checked={form.wantTax} onChange={set("wantTax")} /> ต้องการใบกำกับภาษีเต็มรูป</label>
            {form.wantTax && (
              <textarea rows={2} className="input" placeholder="ชื่อบริษัท / ชื่อผู้เสียภาษี, เลขประจำตัวผู้เสียภาษี 13 หลัก, ที่อยู่สำหรับออกใบกำกับ" value={form.taxInvoice} onChange={set("taxInvoice")} />
            )}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-lg font-semibold">วิธีชำระเงิน</legend>
            <PayOption value="transfer" title="โอนเงิน / สแกน PromptPay QR" desc="แสดงเลขบัญชีและ QR หลังยืนยันคำสั่งซื้อ แล้วส่งสลิปทาง LINE" />
            {quote?.payment.cod !== false && (
              <PayOption value="cod" title="เก็บเงินปลายทาง (COD)" desc={`ชำระเงินสดกับพนักงานขนส่ง${quote?.payment.codFee ? ` (ค่าธรรมเนียม ฿${quote.payment.codFee})` : ""}`} />
            )}
            <PayOption value="card" title="บัตรเครดิต / เดบิต" desc={quote?.payment.card ? "ชำระผ่านระบบตัดบัตรที่ปลอดภัย" : "เร็ว ๆ นี้"} disabled={!quote?.payment.card} />
            {err("paymentMethod")}
          </fieldset>
        </div>

        <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold">สรุปคำสั่งซื้อ ({lines.reduce((s, l) => s + l.qty, 0)} ชิ้น)</h2>
          <ul className="max-h-72 space-y-3 overflow-y-auto">
            {lines.map((l) => (
              <li key={l.variantId} className="flex gap-3 text-sm">
                <Img src={l.image} alt="" className="h-16 w-12 rounded bg-soft object-cover" />
                <div className="flex-1">
                  <p className="line-clamp-1">{l.name}</p>
                  <p className="text-xs text-muted">{l.color} / {l.size} × {l.qty}</p>
                  {l.stock <= 0 && <p className="text-xs text-sale">สินค้าหมด</p>}
                </div>
                <span>฿{(l.price * l.qty).toLocaleString("th-TH")}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input className="input" placeholder="โค้ดส่วนลด" value={coupon} onChange={(e) => setCoupon(e.target.value)} aria-label="โค้ดส่วนลด" />
            <button type="button" className="btn-outline shrink-0" onClick={() => setApplied(coupon.trim().toUpperCase())}>ใช้โค้ด</button>
          </div>
          {applied && quote?.totals.couponError && <p className="text-sm text-sale">{quote.totals.couponError}</p>}
          {err("couponCode")}
          {quote && <Summary totals={quote.totals} freeShippingMin={quote.freeShippingMin} />}
          <label className="flex gap-2 text-sm">
            <input type="checkbox" className="mt-1 accent-ink" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>ฉันยอมรับ <Link href="/policies/terms" target="_blank" className="underline">ข้อกำหนดและเงื่อนไข</Link> และ <Link href="/policies/privacy" target="_blank" className="underline">นโยบายความเป็นส่วนตัว</Link> *</span>
          </label>
          {err("acceptTerms")}
          <label className="flex gap-2 text-sm text-muted">
            <input type="checkbox" className="mt-1 accent-ink" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>ยินยอมรับข่าวสาร โปรโมชั่น และสิทธิพิเศษจาก Mynds (ไม่บังคับ)</span>
          </label>
          {error && !["name", "phone", "email", "address", "province", "postcode", "paymentMethod", "acceptTerms", "couponCode"].includes(error.field ?? "") && (
            <p className="rounded-lg bg-sale/10 p-3 text-sm text-sale" role="alert">{error.message}</p>
          )}
          {error?.field && <p className="text-sm text-sale" role="alert">กรุณาตรวจสอบข้อมูลที่ไฮไลต์</p>}
          <button className="btn-primary w-full py-3 text-base" disabled={submitting || loading || !quote || lines.some((l) => l.stock <= 0)}>
            {submitting ? "กำลังสั่งซื้อ..." : `ยืนยันคำสั่งซื้อ${quote ? ` · ฿${quote.totals.total.toLocaleString("th-TH")}` : ""}`}
          </button>
        </aside>
      </div>
    </form>
  );
}
