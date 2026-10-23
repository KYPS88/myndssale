import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseProductMaster, type ImportedProduct } from "./catalog.ts";
import { seedArticles } from "./articles.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'UNISEX',
  collection TEXT,
  short_description TEXT,
  description TEXT,
  material TEXT,
  care TEXT,
  fit TEXT,
  features TEXT,
  seo_title TEXT,
  seo_description TEXT,
  size_chart_url TEXT,
  video_url TEXT,
  images TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  featured INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  price REAL NOT NULL,
  compare_at REAL,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  barcode TEXT,
  weight REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_method TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  subdistrict TEXT,
  district TEXT,
  province TEXT NOT NULL,
  postcode TEXT NOT NULL,
  note TEXT,
  tax_invoice TEXT,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  shipping REAL NOT NULL DEFAULT 0,
  cod_fee REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  coupon_code TEXT,
  carrier TEXT,
  tracking_no TEXT,
  admin_note TEXT,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INTEGER,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL,
  image TEXT
);
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed','free_shipping')),
  value REAL NOT NULL DEFAULT 0,
  min_subtotal REAL NOT NULL DEFAULT 0,
  max_discount REAL,
  starts_at TEXT,
  ends_at TEXT,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  description TEXT
);
CREATE TABLE IF NOT EXISTS restock_requests (
  id INTEGER PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  contact TEXT NOT NULL,
  notified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  body TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS stock_sync_log (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  trigger TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  ok INTEGER NOT NULL DEFAULT 0,
  checked INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  missing TEXT,
  error TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const DEFAULT_SETTINGS: Record<string, string> = {
  shipping_flat: "50",
  free_shipping_min: "990",
  cod_enabled: "1",
  cod_fee: "20",
  bank_name: "",
  bank_account_name: "บริษัท มายด์ โปรดักส์ จำกัด",
  bank_account_no: "",
  promptpay_id: "",
  card_enabled: "0",
  shipping_note: "จัดส่งทั่วประเทศไทย 1–3 วันทำการ (ต่างจังหวัดห่างไกล 3–5 วัน) ตัดรอบส่งทุกวัน 14:00 น.",
  announcement: "ส่งฟรีเมื่อช้อปครบ ฿990 · เปลี่ยนไซซ์ได้ภายใน 7 วัน",
  // ประวัติแบรนด์ (หน้า /about) — แก้ได้ในหลังบ้าน › ตั้งค่าร้าน; เว้นว่างจะใช้ข้อความตั้งต้น
  brand_story: "",
};

export type DB = DatabaseSync;

let instance: DatabaseSync | null = null;

export function dbPath(): string {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "mynds.db");
}

export function openDb(file = dbPath()): DatabaseSync {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  const ins = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) ins.run(k, v);
  return db;
}

/** Shared connection for the Next.js server. Seeds the catalog on first boot. */
export function getDb(): DatabaseSync {
  if (instance) return instance;
  const db = openDb();
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number };
  const csv = path.join(process.cwd(), "data", "product-master.csv");
  if (n === 0 && existsSync(csv)) {
    importProducts(db, parseProductMaster(readFileSync(csv, "utf8")));
  }
  seedArticles(db);
  instance = db;
  return db;
}

export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export type ImportResult = { products: number; variants: number; created: number; updated: number };

/**
 * Upsert สินค้าจากชีต: ข้อมูลสินค้า ราคา และสต็อกยึดตามชีต
 * ส่วนที่แอดมินตั้งในหลังบ้าน (สถานะเผยแพร่ / สินค้าแนะนำ) จะไม่ถูกเขียนทับ
 */
export function importProducts(db: DatabaseSync, products: ImportedProduct[]): ImportResult {
  const res: ImportResult = { products: 0, variants: 0, created: 0, updated: 0 };
  const findProduct = db.prepare("SELECT id FROM products WHERE sku = ?");
  const insertProduct = db.prepare(`INSERT INTO products
    (sku, slug, name, name_en, category, gender, collection, short_description, description, material, care, fit,
     features, seo_title, seo_description, size_chart_url, video_url, images, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const updateProduct = db.prepare(`UPDATE products SET
    name=?, name_en=?, category=?, gender=?, collection=?, short_description=?, description=?, material=?, care=?, fit=?,
    features=?, seo_title=?, seo_description=?, size_chart_url=?, video_url=?, images=?, updated_at=datetime('now')
    WHERE id=?`);
  const upsertVariant = db.prepare(`INSERT INTO variants (product_id, sku, color, size, price, compare_at, stock, image, barcode, weight)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(sku) DO UPDATE SET product_id=excluded.product_id, color=excluded.color, size=excluded.size,
      price=excluded.price, compare_at=excluded.compare_at, stock=excluded.stock, image=excluded.image,
      barcode=excluded.barcode, weight=excluded.weight`);

  transaction(db, () => {
    for (const p of products) {
      const fields = [
        p.name, p.nameEn, p.category, p.gender, p.collection, p.shortDescription, p.description, p.material,
        p.care, p.fit, p.features, p.seoTitle, p.seoDescription, p.sizeChartUrl, p.videoUrl, JSON.stringify(p.images),
      ] as const;
      const existing = findProduct.get(p.sku) as { id: number } | undefined;
      let id: number;
      if (existing) {
        updateProduct.run(...fields, existing.id);
        id = existing.id;
        res.updated++;
      } else {
        const r = insertProduct.run(p.sku, p.slug, ...fields, p.status);
        id = Number(r.lastInsertRowid);
        res.created++;
      }
      res.products++;
      for (const v of p.variants) {
        upsertVariant.run(id, v.sku, v.color, v.size, v.price, v.compareAt, v.stock, v.image, v.barcode, v.weight);
        res.variants++;
      }
    }
  });
  return res;
}

export function getSettings(db = getDb()): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}
