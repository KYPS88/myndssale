/** Pure order-total logic shared by cart preview and server-side order creation. */

export type Coupon = {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  active: number;
};

export type ShippingRules = {
  flat: number;
  freeMin: number;
  codFee: number;
};

export type Totals = {
  subtotal: number;
  discount: number;
  shipping: number;
  codFee: number;
  total: number;
  couponError: string | null;
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Returns an error message (Thai) if the coupon can't be used, else null. */
export function couponProblem(c: Coupon | null | undefined, subtotal: number, now = new Date()): string | null {
  if (!c || !c.active) return "ไม่พบคูปองนี้";
  if (c.starts_at && new Date(c.starts_at) > now) return "คูปองยังไม่เริ่มใช้งาน";
  if (c.ends_at && new Date(c.ends_at) < now) return "คูปองหมดอายุแล้ว";
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return "คูปองถูกใช้ครบจำนวนแล้ว";
  if (subtotal < c.min_subtotal) return `ต้องมียอดซื้อขั้นต่ำ ฿${c.min_subtotal.toLocaleString("th-TH")}`;
  return null;
}

export function computeTotals(
  lines: { price: number; qty: number }[],
  rules: ShippingRules,
  opts: { coupon?: Coupon | null; cod?: boolean; now?: Date } = {},
): Totals {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.qty, 0));
  let shipping = subtotal === 0 || (rules.freeMin > 0 && subtotal >= rules.freeMin) ? 0 : rules.flat;
  let discount = 0;
  let couponError: string | null = null;

  if (opts.coupon !== undefined) {
    couponError = couponProblem(opts.coupon, subtotal, opts.now);
    const c = opts.coupon;
    if (!couponError && c) {
      if (c.type === "percent") discount = (subtotal * c.value) / 100;
      else if (c.type === "fixed") discount = c.value;
      else shipping = 0;
      if (c.max_discount != null && c.max_discount > 0) discount = Math.min(discount, c.max_discount);
      discount = Math.min(round2(discount), subtotal);
    }
  }

  const codFee = opts.cod ? rules.codFee : 0;
  const total = round2(subtotal - discount + shipping + codFee);
  return { subtotal, discount, shipping, codFee, total, couponError };
}

export function rulesFromSettings(s: Record<string, string>): ShippingRules {
  return {
    flat: Number(s.shipping_flat) || 0,
    freeMin: Number(s.free_shipping_min) || 0,
    codFee: Number(s.cod_fee) || 0,
  };
}
