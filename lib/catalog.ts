/**
 * แปลงข้อมูลจากชีต 03_Product_Master (export เป็น CSV) ให้เป็นสินค้า + variant
 * ที่พร้อมใช้ในเว็บ ข้อมูลต้นทางยังไม่ครบ (หมวดหมู่/เพศว่างหลายแถว ตัวพิมพ์ไซซ์ไม่ตรงกัน)
 * จึงต้องเดาหมวดหมู่และกลุ่มจากชื่อสินค้าแทน — ถ้าทีมกรอกคอลัมน์ในชีตแล้ว จะใช้ค่าจากชีตก่อนเสมอ
 */
import { parseCsv } from "./csv.ts";

export type ImportedVariant = {
  sku: string;
  color: string;
  size: string;
  price: number;
  compareAt: number | null;
  stock: number;
  image: string | null;
  barcode: string | null;
  weight: number;
};

export type ImportedProduct = {
  sku: string;
  slug: string;
  name: string;
  nameEn: string | null;
  category: string;
  gender: "UNISEX" | "WOMEN" | "KIDS";
  collection: string | null;
  description: string | null;
  shortDescription: string | null;
  material: string | null;
  care: string | null;
  fit: string | null;
  features: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sizeChartUrl: string | null;
  videoUrl: string | null;
  images: string[];
  status: "active" | "hidden";
  variants: ImportedVariant[];
};

const HEADERS = {
  sku: "SKU หลัก",
  name: "ชื่อสินค้า TH",
  nameEn: "ชื่อสินค้า EN",
  category: "หมวดหมู่หลัก",
  subCategory: "หมวดหมู่ย่อย",
  collection: "คอลเลกชัน",
  status: "สถานะสินค้า",
  short: "คำอธิบายสั้น",
  description: "รายละเอียดสินค้า",
  material: "วัสดุ/ส่วนผสม",
  care: "วิธีดูแล",
  fit: "ทรง/ฟิต",
  gender: "เพศ/กลุ่ม",
  color: "สี",
  size: "ไซซ์",
  variantSku: "รหัส Variant SKU",
  barcode: "บาร์โค้ด",
  regularPrice: "ราคาปกติ",
  salePrice: "ราคาขาย",
  stock: "จำนวนสต็อก",
  weight: "น้ำหนัก (กรัม)",
  image: "รูปภาพหลัก URL",
  extraImages: "รูปภาพเสริม URL",
  video: "วิดีโอ URL",
  sizeChart: "ตารางไซซ์ URL",
  features: "จุดขาย/คุณสมบัติ",
  seoTitle: "SEO Title",
  seoDescription: "Meta Description",
  publish: "เผยแพร่?",
} as const;

export const SIZE_ORDER = [
  "90", "100", "110", "120", "130", "140",
  "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "F",
];

export function sizeRank(size: string): number {
  const i = SIZE_ORDER.indexOf(size);
  return i === -1 ? 999 : i;
}

export function normalizeSize(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (s === "XXL") return "2XL";
  if (s === "XXXL") return "3XL";
  if (s === "FREESIZE" || s === "FREE") return "F";
  return s;
}

/** "DARK GRAY" / "Dark Gray" / "dark gray" → "Dark Gray"; ชื่อสีภาษาไทยคงเดิม */
export function normalizeColor(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/");
  if (!s) return "-";
  if (/[฀-๿]/.test(s)) return s;
  return s
    .toLowerCase()
    .replace(/(^|[\s/])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

export function inferCategory(name: string, sku: string, fromSheet: string): string {
  if (fromSheet.trim()) return fromSheet.trim();
  const n = `${name} ${sku}`.toLowerCase();
  if (/โปโล|polo/.test(n)) return "เสื้อโปโล";
  if (/กางเกง|pant|chino/.test(n)) return "กางเกง";
  if (/กระโปรง|skirt/.test(n)) return "กระโปรง";
  if (/สเวตเตอร์|sweater/.test(n)) return "เสื้อสเวตเตอร์";
  if (/คาร์ดิแกน|cardigan/.test(n)) return "เสื้อคาร์ดิแกน";
  if (/shirt collection|เชิ้ต/.test(n)) return "เสื้อเชิ้ต";
  if (/ปลอกหมอน|pillow|น้ำยา|softener|downy/.test(n)) return "ของแถม";
  if (/แขนยาว|longsleeve|long-sleeve|-ls\b|\bls\b/.test(n)) return "เสื้อแขนยาว";
  if (/แขนกุด|sleeveless/.test(n)) return "เสื้อแขนกุด";
  return "เสื้อยืด";
}

export function inferGender(name: string, sku: string, fromSheet: string): ImportedProduct["gender"] {
  const n = `${name} ${sku}`.toLowerCase();
  if (/kids/.test(n)) return "KIDS";
  const g = fromSheet.trim().toUpperCase();
  if (g === "WOMEN" || g === "KIDS" || g === "UNISEX") return g;
  if (/ผู้หญิง|woman|women|babytee|กระโปรง|skirt/.test(n)) return "WOMEN";
  return "UNISEX";
}

export function inferCollection(name: string, sku: string, fromSheet: string): string | null {
  if (fromSheet.trim()) return fromSheet.trim();
  const n = `${name} ${sku}`.toLowerCase();
  if (/disney|toystory|fandom|conโสด|mirttime|สามย่าน|cutecute/.test(n)) return "Collaboration";
  if (/active life|^atl/.test(n)) return "Active Life";
  if (/uv protection|sunlight/.test(n)) return "UV Protection";
  if (/ultra ?cool|โคตรเย็น|โครตเย็น/.test(n)) return "Ultra Cool";
  if (/ไม่ร้อน|anti & heat|airlite/.test(n)) return "Anti-Heat";
  return null;
}

function num(v: string | undefined): number {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function clean(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s ? s : null;
}

function slugify(sku: string): string {
  return sku.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function parseProductMaster(csvText: string): ImportedProduct[] {
  const rows = parseCsv(csvText);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  const col = (key: keyof typeof HEADERS) => header.indexOf(HEADERS[key]);
  const idx = Object.fromEntries(
    (Object.keys(HEADERS) as (keyof typeof HEADERS)[]).map((k) => [k, col(k)]),
  ) as Record<keyof typeof HEADERS, number>;
  if (idx.sku < 0 || idx.variantSku < 0) {
    throw new Error("CSV ไม่ใช่รูปแบบชีต 03_Product_Master (ไม่พบคอลัมน์ SKU หลัก / รหัส Variant SKU)");
  }
  const get = (r: string[], k: keyof typeof HEADERS) => (idx[k] >= 0 ? r[idx[k]] ?? "" : "");

  const groups = new Map<string, string[][]>();
  for (const r of rows.slice(1)) {
    const sku = get(r, "sku").trim();
    if (!sku) continue;
    if (!groups.has(sku)) groups.set(sku, []);
    groups.get(sku)!.push(r);
  }

  const products: ImportedProduct[] = [];
  for (const [sku, rs] of groups) {
    const first = (k: keyof typeof HEADERS) => rs.map((r) => get(r, k).trim()).find(Boolean) ?? "";
    const name = first("name").replace(/\s+/g, " ").trim() || sku;

    const seenVariant = new Set<string>();
    const variants: ImportedVariant[] = [];
    for (const r of rs) {
      const vsku = get(r, "variantSku").trim();
      if (!vsku || seenVariant.has(vsku.toUpperCase())) continue;
      seenVariant.add(vsku.toUpperCase());
      const sale = num(get(r, "salePrice"));
      const regular = num(get(r, "regularPrice"));
      const price = sale > 0 ? sale : regular;
      variants.push({
        sku: vsku,
        color: normalizeColor(get(r, "color")),
        size: normalizeSize(get(r, "size")) || "F",
        price,
        compareAt: regular > price ? regular : null,
        stock: Math.max(0, Math.floor(num(get(r, "stock")))),
        image: clean(get(r, "image")),
        barcode: clean(get(r, "barcode")),
        weight: num(get(r, "weight")),
      });
    }

    const images: string[] = [];
    for (const r of rs) {
      for (const u of get(r, "extraImages").split(/[\n\s,]+/)) {
        const url = u.trim();
        if (/^https?:\/\//.test(url) && !images.includes(url)) images.push(url);
      }
    }

    const category = inferCategory(name, sku, first("category"));
    const publish = first("publish").toLowerCase();
    const statusText = first("status");
    const sellable = variants.some((v) => v.price > 0);
    const hidden =
      category === "ของแถม" ||
      !sellable ||
      statusText === "ปิดใช้งาน" ||
      /^(ซ่อน|inactive|draft)/i.test(statusText) ||
      ["no", "false", "ไม่", "ไม่ใช่", "n"].includes(publish);

    products.push({
      sku,
      slug: slugify(sku),
      name,
      nameEn: clean(first("nameEn")),
      category,
      gender: inferGender(name, sku, first("gender")),
      collection: inferCollection(name, sku, first("collection")),
      description: clean(first("description")),
      shortDescription: clean(first("short")),
      material: clean(first("material")),
      care: clean(first("care")),
      fit: clean(first("fit")),
      features: clean(first("features")),
      seoTitle: clean(first("seoTitle")),
      seoDescription: clean(first("seoDescription")),
      sizeChartUrl: clean(first("sizeChart")),
      videoUrl: clean(first("video")),
      images,
      status: hidden ? "hidden" : "active",
      variants,
    });
  }

  // ชื่อซ้ำกันหลาย SKU (เช่น FANDOM 01/02/03) → ต่อท้ายรหัสลายให้แยกได้
  const byName = new Map<string, ImportedProduct[]>();
  for (const p of products) {
    const k = p.name.toLowerCase();
    byName.set(k, [...(byName.get(k) ?? []), p]);
  }
  for (const list of byName.values()) {
    if (list.length < 2) continue;
    const tails = list.map((p) => p.sku.split("-").pop()!);
    const unique = new Set(tails).size === tails.length;
    list.forEach((p, i) => {
      p.name = `${p.name} (${unique ? tails[i] : p.sku})`;
    });
  }
  return products;
}
