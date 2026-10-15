"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, endSession, isAdmin, startSession } from "@/lib/auth";
import { getDb, importProducts, transaction } from "@/lib/db";
import { parseProductMaster } from "@/lib/catalog";
import { updateOrder, type OrderStatus } from "@/lib/orders";

async function guard() {
  if (!(await isAdmin())) redirect("/admin/login");
}

const attempts = new Map<string, { n: number; until: number }>();

export async function login(formData: FormData) {
  const key = "global";
  const a = attempts.get(key);
  if (a && a.until > Date.now()) redirect("/admin/login?error=locked");
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(key, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    redirect("/admin/login?error=1");
  }
  attempts.delete(key);
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

export async function saveOrder(formData: FormData) {
  await guard();
  const no = String(formData.get("orderNo"));
  updateOrder(no, {
    status: (String(formData.get("status") || "") || undefined) as OrderStatus | undefined,
    carrier: String(formData.get("carrier") ?? "").trim() || undefined,
    trackingNo: String(formData.get("trackingNo") ?? "").trim() || undefined,
    adminNote: String(formData.get("adminNote") ?? "").trim() || undefined,
    note: String(formData.get("eventNote") ?? "").trim() || undefined,
  });
  revalidatePath(`/admin/orders/${no}`);
  redirect(`/admin/orders/${no}?saved=1`);
}

export async function saveProduct(formData: FormData) {
  await guard();
  const db = getDb();
  const id = Number(formData.get("id"));
  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;
  transaction(db, () => {
    db.prepare(
      `UPDATE products SET name=?, category=?, gender=?, collection=?, short_description=?, description=?, material=?, care=?, fit=?,
        features=?, seo_title=?, seo_description=?, size_chart_url=?, status=?, featured=?, updated_at=datetime('now') WHERE id=?`,
    ).run(
      text("name") ?? "", text("category") ?? "เสื้อยืด", text("gender") ?? "UNISEX", text("collection"), text("short_description"),
      text("description"), text("material"), text("care"), text("fit"), text("features"), text("seo_title"), text("seo_description"),
      text("size_chart_url"), formData.get("status") === "active" ? "active" : "hidden", formData.get("featured") ? 1 : 0, id,
    );
    const upd = db.prepare("UPDATE variants SET price=?, compare_at=?, stock=? WHERE id=? AND product_id=?");
    for (const [k, v] of formData.entries()) {
      const m = /^v_(\d+)_price$/.exec(k);
      if (!m) continue;
      const vid = Number(m[1]);
      const price = Math.max(0, Number(v) || 0);
      const cmp = Number(formData.get(`v_${vid}_compare`)) || null;
      const stock = Math.max(0, Math.floor(Number(formData.get(`v_${vid}_stock`)) || 0));
      upd.run(price, cmp && cmp > price ? cmp : null, stock, vid, id);
    }
  });
  revalidatePath("/", "layout");
  redirect(`/admin/products/${id}?saved=1`);
}

export async function saveCoupon(formData: FormData) {
  await guard();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) redirect("/admin/coupons?error=code");
  const type = String(formData.get("type"));
  if (!["percent", "fixed", "free_shipping"].includes(type)) redirect("/admin/coupons?error=type");
  const n = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };
  const d = (k: string) => String(formData.get(k) ?? "").trim() || null;
  // datetime-local ไม่มี timezone → ถือเป็นเวลาไทย
  const bkk = (k: string) => {
    const v = d(k);
    return v && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00+07:00` : v;
  };
  getDb()
    .prepare(
      `INSERT INTO coupons (code, type, value, min_subtotal, max_discount, starts_at, ends_at, usage_limit, active, description)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(code) DO UPDATE SET type=excluded.type, value=excluded.value, min_subtotal=excluded.min_subtotal,
         max_discount=excluded.max_discount, starts_at=excluded.starts_at, ends_at=excluded.ends_at,
         usage_limit=excluded.usage_limit, active=excluded.active, description=excluded.description`,
    )
    .run(code, type, n("value") ?? 0, n("min_subtotal") ?? 0, n("max_discount"), bkk("starts_at"), bkk("ends_at"), n("usage_limit"), formData.get("active") ? 1 : 0, d("description"));
  redirect("/admin/coupons?saved=1");
}

export async function deleteCoupon(formData: FormData) {
  await guard();
  getDb().prepare("DELETE FROM coupons WHERE code = ?").run(String(formData.get("code")));
  redirect("/admin/coupons");
}

const SETTING_KEYS = ["shipping_flat", "free_shipping_min", "cod_enabled", "cod_fee", "card_enabled", "bank_name", "bank_account_name", "bank_account_no", "promptpay_id", "shipping_note", "announcement"];

export async function saveSettings(formData: FormData) {
  await guard();
  const db = getDb();
  const st = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  for (const k of SETTING_KEYS) {
    const v = k.endsWith("_enabled") ? (formData.get(k) ? "1" : "0") : String(formData.get(k) ?? "").trim();
    st.run(k, v);
  }
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

export async function importCsv(formData: FormData) {
  await guard();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/import?error=" + encodeURIComponent("กรุณาเลือกไฟล์ CSV"));
  if (file.size > 20 * 1024 * 1024) redirect("/admin/import?error=" + encodeURIComponent("ไฟล์ใหญ่เกิน 20MB"));
  let msg: string;
  try {
    const r = importProducts(getDb(), parseProductMaster(await file.text()));
    msg = `นำเข้าแล้ว ${r.products} สินค้า (ใหม่ ${r.created}, อัปเดต ${r.updated}) · ${r.variants} variant`;
  } catch (e) {
    redirect("/admin/import?error=" + encodeURIComponent(e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ"));
  }
  revalidatePath("/", "layout");
  redirect("/admin/import?ok=" + encodeURIComponent(msg));
}
