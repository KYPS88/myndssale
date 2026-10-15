import { randomInt } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDb, getSettings, transaction } from "./db.ts";
import { computeTotals, rulesFromSettings, type Coupon } from "./pricing.ts";

export const ORDER_STATUSES = [
  { key: "pending_payment", label: "รอชำระเงิน" },
  { key: "paid", label: "ชำระเงินแล้ว" },
  { key: "processing", label: "กำลังแพ็กสินค้า" },
  { key: "shipped", label: "จัดส่งแล้ว" },
  { key: "completed", label: "สำเร็จ" },
  { key: "cancelled", label: "ยกเลิก" },
  { key: "refunded", label: "คืนเงินแล้ว" },
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number]["key"];
export const STATUS_LABEL = Object.fromEntries(ORDER_STATUSES.map((s) => [s.key, s.label])) as Record<string, string>;
const RESTOCK_STATUSES = new Set(["cancelled", "refunded"]);

export const PAYMENT_LABEL: Record<string, string> = {
  transfer: "โอนเงิน / PromptPay QR",
  cod: "เก็บเงินปลายทาง (COD)",
  card: "บัตรเครดิต/เดบิต",
};

export type CheckoutInput = {
  items: { variantId: number; qty: number }[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    subdistrict?: string;
    district?: string;
    province: string;
    postcode: string;
    note?: string;
    taxInvoice?: string;
  };
  paymentMethod: "transfer" | "cod" | "card";
  couponCode?: string;
  marketingConsent?: boolean;
  acceptTerms: boolean;
};

export class CheckoutError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

export function normalizePhone(p: string): string {
  let d = p.replace(/\D/g, "");
  if (d.startsWith("66") && d.length === 11) d = "0" + d.slice(2);
  return d;
}

function str(v: unknown, max = 300): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function validateCheckout(raw: unknown): CheckoutInput {
  const r = (raw ?? {}) as Record<string, unknown>;
  const c = (r.customer ?? {}) as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items : [];
  if (!items.length) throw new CheckoutError("ตะกร้าสินค้าว่าง");
  if (items.length > 50) throw new CheckoutError("รายการสินค้ามากเกินไป");
  const merged = new Map<number, number>();
  for (const it of items as Record<string, unknown>[]) {
    const id = Number(it?.variantId);
    const qty = Math.floor(Number(it?.qty));
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(qty) || qty <= 0 || qty > 99) {
      throw new CheckoutError("ข้อมูลสินค้าในตะกร้าไม่ถูกต้อง");
    }
    merged.set(id, (merged.get(id) ?? 0) + qty);
  }
  const customer = {
    name: str(c.name, 120),
    phone: normalizePhone(str(c.phone, 30)),
    email: str(c.email, 160) || undefined,
    address: str(c.address, 500),
    subdistrict: str(c.subdistrict, 120) || undefined,
    district: str(c.district, 120) || undefined,
    province: str(c.province, 120),
    postcode: str(c.postcode, 10),
    note: str(c.note, 500) || undefined,
    taxInvoice: str(c.taxInvoice, 500) || undefined,
  };
  if (customer.name.length < 2) throw new CheckoutError("กรุณากรอกชื่อ-นามสกุล", "name");
  if (!/^0\d{8,9}$/.test(customer.phone)) throw new CheckoutError("เบอร์โทรศัพท์ไม่ถูกต้อง", "phone");
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw new CheckoutError("อีเมลไม่ถูกต้อง", "email");
  }
  if (customer.address.length < 5) throw new CheckoutError("กรุณากรอกที่อยู่จัดส่ง", "address");
  if (!customer.province) throw new CheckoutError("กรุณาเลือกจังหวัด", "province");
  if (!/^\d{5}$/.test(customer.postcode)) throw new CheckoutError("รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก", "postcode");
  const pm = r.paymentMethod;
  if (pm !== "transfer" && pm !== "cod" && pm !== "card") throw new CheckoutError("กรุณาเลือกวิธีชำระเงิน", "paymentMethod");
  if (r.acceptTerms !== true) throw new CheckoutError("กรุณายอมรับเงื่อนไขการสั่งซื้อและนโยบายความเป็นส่วนตัว", "acceptTerms");
  return {
    items: [...merged.entries()].map(([variantId, qty]) => ({ variantId, qty })),
    customer,
    paymentMethod: pm,
    couponCode: str(r.couponCode, 40).toUpperCase() || undefined,
    marketingConsent: r.marketingConsent === true,
    acceptTerms: true,
  };
}

export function findCoupon(db: DatabaseSync, code: string | undefined): Coupon | null {
  if (!code) return null;
  return (db.prepare("SELECT * FROM coupons WHERE code = ? COLLATE NOCASE").get(code) as Coupon | undefined) ?? null;
}

type CartVariant = {
  id: number;
  sku: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  image: string | null;
  product_id: number;
  name: string;
  slug: string;
  status: string;
};

export function loadCartVariants(db: DatabaseSync, ids: number[]): Map<number, CartVariant> {
  if (!ids.length) return new Map();
  const rows = db
    .prepare(
      `SELECT v.id, v.sku, v.color, v.size, v.price, v.stock, v.image, v.product_id, p.name, p.slug, p.status
       FROM variants v JOIN products p ON p.id = v.product_id
       WHERE v.id IN (${ids.map(() => "?").join(",")})`,
    )
    .all(...ids) as CartVariant[];
  return new Map(rows.map((r) => [r.id, r]));
}

function newOrderNo(db: DatabaseSync): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  for (;;) {
    const no = `MY${ymd}${randomInt(10000, 99999)}`;
    if (!db.prepare("SELECT 1 FROM orders WHERE order_no = ?").get(no)) return no;
  }
}

export function createOrder(input: CheckoutInput, db = getDb()) {
  const settings = getSettings(db);
  if (input.paymentMethod === "cod" && settings.cod_enabled !== "1") {
    throw new CheckoutError("ขณะนี้ยังไม่เปิดรับเก็บเงินปลายทาง", "paymentMethod");
  }
  if (input.paymentMethod === "card" && settings.card_enabled !== "1") {
    throw new CheckoutError("ขณะนี้ยังไม่เปิดรับชำระด้วยบัตร", "paymentMethod");
  }

  return transaction(db, () => {
    const variants = loadCartVariants(db, input.items.map((i) => i.variantId));
    const lines = input.items.map((i) => {
      const v = variants.get(i.variantId);
      if (!v || v.status !== "active" || v.price <= 0) throw new CheckoutError("มีสินค้าบางรายการไม่พร้อมขายแล้ว กรุณาตรวจสอบตะกร้า");
      if (v.stock < i.qty) {
        throw new CheckoutError(`${v.name} สี ${v.color} ไซซ์ ${v.size} เหลือเพียง ${v.stock} ชิ้น`);
      }
      return { v, qty: i.qty, price: v.price };
    });

    const coupon = input.couponCode ? findCoupon(db, input.couponCode) : undefined;
    const totals = computeTotals(lines, rulesFromSettings(settings), {
      coupon,
      cod: input.paymentMethod === "cod",
    });
    if (input.couponCode && totals.couponError) throw new CheckoutError(totals.couponError, "couponCode");

    const orderNo = newOrderNo(db);
    const status: OrderStatus = input.paymentMethod === "cod" ? "processing" : "pending_payment";
    const c = input.customer;
    const res = db
      .prepare(
        `INSERT INTO orders (order_no, status, payment_method, customer_name, phone, email, address, subdistrict, district,
          province, postcode, note, tax_invoice, subtotal, discount, shipping, cod_fee, total, coupon_code, marketing_consent)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        orderNo, status, input.paymentMethod, c.name, c.phone, c.email ?? null, c.address, c.subdistrict ?? null,
        c.district ?? null, c.province, c.postcode, c.note ?? null, c.taxInvoice ?? null, totals.subtotal,
        totals.discount, totals.shipping, totals.codFee, totals.total, coupon && !totals.couponError ? coupon.code : null,
        input.marketingConsent ? 1 : 0,
      );
    const orderId = Number(res.lastInsertRowid);
    const insItem = db.prepare(
      "INSERT INTO order_items (order_id, variant_id, sku, name, color, size, price, qty, image) VALUES (?,?,?,?,?,?,?,?,?)",
    );
    const decStock = db.prepare("UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?");
    const incSold = db.prepare("UPDATE products SET sold_count = sold_count + ? WHERE id = ?");
    for (const l of lines) {
      const r = decStock.run(l.qty, l.v.id, l.qty);
      if (Number(r.changes) !== 1) throw new CheckoutError(`${l.v.name} สต็อกไม่พอ`);
      incSold.run(l.qty, l.v.product_id);
      insItem.run(orderId, l.v.id, l.v.sku, l.v.name, l.v.color, l.v.size, l.price, l.qty, l.v.image);
    }
    if (coupon && !totals.couponError) {
      db.prepare("UPDATE coupons SET used_count = used_count + 1 WHERE code = ?").run(coupon.code);
    }
    db.prepare("INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)").run(orderId, status, "สร้างคำสั่งซื้อ");
    return { orderNo, orderId, total: totals.total, status };
  });
}

export type Order = {
  id: number;
  order_no: string;
  status: OrderStatus;
  payment_method: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  subdistrict: string | null;
  district: string | null;
  province: string;
  postcode: string;
  note: string | null;
  tax_invoice: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  cod_fee: number;
  total: number;
  coupon_code: string | null;
  carrier: string | null;
  tracking_no: string | null;
  admin_note: string | null;
  marketing_consent: number;
  created_at: string;
  updated_at: string;
  items: { id: number; variant_id: number | null; sku: string; name: string; color: string; size: string; price: number; qty: number; image: string | null }[];
  events: { status: string; note: string | null; created_at: string }[];
};

export function getOrder(orderNo: string, db = getDb()): Order | null {
  const o = db.prepare("SELECT * FROM orders WHERE order_no = ?").get(orderNo) as Omit<Order, "items" | "events"> | undefined;
  if (!o) return null;
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id").all(o.id) as Order["items"];
  const events = db
    .prepare("SELECT status, note, created_at FROM order_events WHERE order_id = ? ORDER BY id")
    .all(o.id) as Order["events"];
  return { ...o, items, events };
}

/** Customer-facing lookup: requires matching phone to avoid exposing others' orders. */
export function lookupOrder(orderNo: string, phone: string): Order | null {
  const o = getOrder(orderNo.trim().toUpperCase());
  if (!o || o.phone !== normalizePhone(phone)) return null;
  return o;
}

export function listOrders(opts: { q?: string; status?: string; limit?: number; offset?: number } = {}, db = getDb()) {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.status) {
    where.push("status = ?");
    args.push(opts.status);
  }
  if (opts.q) {
    where.push("(order_no LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR tracking_no LIKE ?)");
    const like = `%${opts.q.trim()}%`;
    args.push(like, like, like, like);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM orders ${w}`).get(...args) as { n: number }).n;
  const rows = db
    .prepare(`SELECT * FROM orders ${w} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...args, opts.limit ?? 50, opts.offset ?? 0) as Omit<Order, "items" | "events">[];
  return { total, rows };
}

export function updateOrder(
  orderNo: string,
  patch: { status?: OrderStatus; carrier?: string; trackingNo?: string; adminNote?: string; note?: string },
  db = getDb(),
) {
  return transaction(db, () => {
    const o = db.prepare("SELECT id, status FROM orders WHERE order_no = ?").get(orderNo) as
      | { id: number; status: OrderStatus }
      | undefined;
    if (!o) throw new Error("ไม่พบคำสั่งซื้อ");
    if (patch.status && !STATUS_LABEL[patch.status]) throw new Error("สถานะไม่ถูกต้อง");
    const next = patch.status ?? o.status;
    if (next !== o.status) {
      const wasRestocked = RESTOCK_STATUSES.has(o.status);
      const restock = RESTOCK_STATUSES.has(next);
      if (restock !== wasRestocked) {
        // ยกเลิก/คืนเงิน → คืนสต็อก; เปลี่ยนกลับเป็นสถานะปกติ → ตัดสต็อกอีกครั้ง
        const sign = restock ? 1 : -1;
        const items = db.prepare("SELECT variant_id, qty FROM order_items WHERE order_id = ?").all(o.id) as {
          variant_id: number | null;
          qty: number;
        }[];
        for (const it of items) {
          if (it.variant_id == null) continue;
          db.prepare("UPDATE variants SET stock = MAX(0, stock + ?) WHERE id = ?").run(sign * it.qty, it.variant_id);
        }
      }
      db.prepare("INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)").run(o.id, next, patch.note ?? null);
    }
    db.prepare(
      `UPDATE orders SET status = ?, carrier = COALESCE(?, carrier), tracking_no = COALESCE(?, tracking_no),
        admin_note = COALESCE(?, admin_note), updated_at = datetime('now') WHERE id = ?`,
    ).run(next, patch.carrier ?? null, patch.trackingNo ?? null, patch.adminNote ?? null, o.id);
    return getOrder(orderNo, db)!;
  });
}
