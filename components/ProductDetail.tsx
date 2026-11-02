"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { swatchBackground } from "@/lib/colors";
import { useCart } from "./CartProvider";
import { QtyStepper } from "./QtyStepper";
import { WishlistButton } from "./Wishlist";
import { track } from "./analytics";
import { SOLD_OUT_IMG, SoldOutOverlay } from "./SoldOut";
import { Img } from "@/components/Img";
import { sendEvent } from "./SiteTracker";

type V = { id: number; sku: string; color: string; size: string; price: number; compare_at: number | null; stock: number; image: string | null };
type P = { slug: string; sku: string; name: string; images: string[]; variants: V[]; sizes: string[] };

const LOW_STOCK = 5;

export function ProductDetail({ p, lineUrl, lineQr, webOrder = true }: { p: P; lineUrl: string; lineQr?: string; webOrder?: boolean }) {
  const { add } = useCart();
  const colors = useMemo(() => [...new Set(p.variants.map((v) => v.color))], [p.variants]);
  const defaultColor = useMemo(() => {
    const stock = new Map<string, number>();
    for (const v of p.variants) stock.set(v.color, (stock.get(v.color) ?? 0) + v.stock);
    return [...stock.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? colors[0];
  }, [p.variants, colors]);
  const [color, setColor] = useState(defaultColor);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const forColor = p.variants.filter((v) => v.color === color);
  const variant = size ? forColor.find((v) => v.size === size) ?? null : null;
  const display = variant ?? forColor.find((v) => v.stock > 0) ?? forColor[0];
  const colorImage = forColor.find((v) => v.image)?.image ?? null;
  const colorSoldOut = forColor.every((v) => v.stock <= 0);

  // รูปหลักเปลี่ยนตามสีที่เลือก ตามด้วยรูปเสริมของสินค้า
  const gallery = useMemo(() => {
    const list = [colorImage, ...p.images].filter((u): u is string => !!u);
    return [...new Set(list)];
  }, [colorImage, p.images]);

  useEffect(() => setImgIndex(0), [color]);
  useEffect(() => {
    track("view_item", { value: display?.price, items: [{ item_id: p.sku, item_name: p.name, price: display?.price ?? 0, quantity: 1 }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.sku]);

  const onAdd = () => {
    if (!variant) {
      setError("กรุณาเลือกไซซ์");
      return;
    }
    if (variant.stock <= 0) return;
    setError("");
    add(
      { variantId: variant.id, sku: variant.sku, slug: p.slug, name: p.name, color: variant.color, size: variant.size, price: variant.price, image: variant.image ?? gallery[0] ?? null, stock: variant.stock },
      qty,
    );
  };

  // สั่งซื้อทาง LINE: คัดลอกรายละเอียดให้ลูกค้าวางในแชท แล้วเปิด LINE
  const orderText = () =>
    [
      "สนใจสั่งซื้อค่ะ/ครับ",
      p.name,
      `สี: ${color} · ไซซ์: ${size ?? "ยังไม่เลือก"} · จำนวน: ${qty}`,
      `รหัส: ${variant?.sku ?? p.sku}`,
      typeof location !== "undefined" ? location.href : "",
    ].filter(Boolean).join("\n");
  const onLineOrder = (e: React.MouseEvent) => {
    sendEvent("line_order", "product");
    // คัดลอกก่อน แล้วค่อยเปิด LINE — ถ้าแท็บใหม่เปิดก่อน หน้าเว็บจะเสีย focus และคัดลอกไม่ได้
    if (copyNow(orderText())) {
      setCopied(true);
      e.preventDefault();
      window.open(lineUrl, "_blank", "noopener");
    }
  };

  const main = gallery[imgIndex] ?? "/placeholder.svg";

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
      <div className="min-w-0 md:sticky md:top-24 md:self-start">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-soft">
          <Img src={main} alt={`${p.name} สี ${color}`} className={`h-full w-full object-cover transition ${colorSoldOut ? SOLD_OUT_IMG : ""}`} />
          {colorSoldOut && <SoldOutOverlay large />}
          <WishlistButton slug={p.slug} className="absolute right-3 top-3" />
        </div>
        {gallery.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {gallery.map((u, i) => (
              <button key={u} onClick={() => setImgIndex(i)} className={`h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === imgIndex ? "border-ink" : "border-transparent"}`} aria-label={`รูปที่ ${i + 1}`}>
                <Img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold leading-snug md:text-3xl">{p.name}</h1>
          <p className="mt-1 text-xs text-muted">SKU: {variant?.sku ?? p.sku}</p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className={`text-2xl font-semibold ${display?.compare_at ? "text-sale" : ""}`}>฿{display?.price.toLocaleString("th-TH")}</span>
            {display?.compare_at ? (
              <>
                <s className="text-muted">฿{display.compare_at.toLocaleString("th-TH")}</s>
                <span className="rounded-full bg-sale/10 px-2 py-0.5 text-xs font-semibold text-sale">
                  ประหยัด {Math.round((1 - display.price / display.compare_at) * 100)}%
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm">สี: <b>{color}</b></p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const soldOut = p.variants.filter((v) => v.color === c).every((v) => v.stock <= 0);
              return (
                <button key={c} type="button" title={c} aria-pressed={c === color} onClick={() => { setColor(c); setSize(null); setQty(1); }}
                  className={`relative h-10 w-10 rounded-full border ${c === color ? "ring-2 ring-ink ring-offset-2" : "border-black/10"} ${soldOut ? "opacity-40" : ""}`}
                  style={{ background: swatchBackground(c) }}>
                  <span className="sr-only">{c}{soldOut ? " (หมด)" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>ไซซ์: <b>{size ?? "-"}</b></span>
            <Link href="/size-guide" className="text-ice underline">ตารางไซซ์</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.sizes.map((s) => {
              const v = forColor.find((x) => x.size === s);
              const disabled = !v || v.stock <= 0;
              return (
                <button key={s} type="button" disabled={disabled} aria-pressed={s === size} onClick={() => { setSize(s); setQty(1); setError(""); }}
                  className={`min-w-14 rounded-lg border px-3 py-2.5 text-sm ${s === size ? "border-ink bg-ink text-white" : "border-line hover:border-ink"} disabled:cursor-not-allowed disabled:bg-soft disabled:text-muted disabled:line-through`}>
                  {s}
                </button>
              );
            })}
          </div>
          {variant && variant.stock > 0 && (
            <p className={`mt-2 text-sm ${variant.stock <= LOW_STOCK ? "font-medium text-sale" : "text-muted"}`}>
              {variant.stock <= LOW_STOCK ? `เหลือเพียง ${variant.stock} ชิ้น` : `มีสินค้า ${variant.stock.toLocaleString("th-TH")} ชิ้น`}
            </p>
          )}
          {colorSoldOut && <p className="mt-2 text-sm text-muted">สี {color} หมดสต็อกทุกไซซ์ — รอสินค้าเข้าเร็ว ๆ นี้ หรือเลือกสีอื่น</p>}
          {error && <p className="mt-2 text-sm text-sale" role="alert">{error}</p>}
        </div>

        <div className="flex items-center gap-3">
          <QtyStepper value={qty} max={variant?.stock ?? 1} onChange={setQty} />
          {webOrder || colorSoldOut ? (
            <button className="btn-primary flex-1 py-3 text-base" onClick={onAdd} disabled={colorSoldOut || (!!variant && variant.stock <= 0)}>
              {colorSoldOut ? "สินค้าหมดสต็อก" : "เพิ่มลงตะกร้า"}
            </button>
          ) : (
            <a href={lineUrl} target="_blank" rel="noopener" data-line="order" onClick={onLineOrder}
              className="btn flex-1 bg-[#06c755] py-3 text-base text-white hover:opacity-90">
              สั่งซื้อทาง LINE
            </a>
          )}
        </div>
        {!webOrder && (
          <p className="-mt-3 text-sm text-muted" role="status">
            {copied
              ? "✓ คัดลอกรายละเอียดสินค้าแล้ว — วางในแชท LINE เพื่อสั่งซื้อได้เลย"
              : "เลือกสี ไซซ์ และจำนวน แล้วกดสั่งซื้อ แอดมินจะยืนยันยอดและค่าส่งให้ในแชท"}
          </p>
        )}
        {!webOrder && lineQr && (
          <div className="hidden items-center gap-4 rounded-xl border border-line p-4 md:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lineQr} alt="QR Code แอดไลน์ Mynds" width={112} height={112} className="h-28 w-28" />
            <p className="text-sm">
              <b>สแกนเพื่อแอดไลน์</b>
              <br />
              สั่งซื้อหรือสอบถามแอดมินได้ทันที
            </p>
          </div>
        )}

        {forColor.some((v) => v.stock <= 0) && <RestockForm variants={forColor.filter((v) => v.stock <= 0)} />}

        <a href={lineUrl} data-line="product-chat" target="_blank" rel="noopener" className="block rounded-xl bg-soft p-4 text-sm">
          💬 สอบถามไซซ์หรือสั่งซื้อจำนวนมาก ทักแอดมินทาง <b className="text-[#06a648]">LINE</b>
        </a>
      </div>
    </div>
  );
}

function RestockForm({ variants }: { variants: V[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/restock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId, contact }) });
    setState(res.ok ? "sent" : "error");
  };
  if (state === "sent") return <p className="rounded-xl bg-ice-light p-4 text-sm text-ice-dark">บันทึกแล้ว เราจะแจ้งคุณเมื่อสินค้ากลับมา</p>;
  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-line p-4">
      <p className="text-sm font-medium">แจ้งเตือนเมื่อสินค้ากลับมามีสต็อก</p>
      <div className="flex gap-2">
        <select className="input w-24" value={variantId} onChange={(e) => setVariantId(Number(e.target.value))} aria-label="ไซซ์">
          {variants.map((v) => <option key={v.id} value={v.id}>{v.size}</option>)}
        </select>
        <input className="input" required placeholder="อีเมล หรือ เบอร์โทร" value={contact} onChange={(e) => setContact(e.target.value)} />
        <button className="btn-outline shrink-0">แจ้งฉัน</button>
      </div>
      {state === "error" && <p className="text-xs text-sale">ไม่สำเร็จ กรุณาตรวจสอบข้อมูล</p>}
    </form>
  );
}

function copyNow(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
