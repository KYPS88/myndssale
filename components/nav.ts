// ลิงก์หมวด/คอลเลกชันต้องตรงกับค่าในชีต 03_Product_Master (tests/nav.test.ts ตรวจให้)
// ถ้าชีตเปลี่ยนชื่อหมวดหรือคอลเลกชัน ให้แก้รายการด้านล่างตาม
export const LONG_SLEEVE_CATEGORIES = ["เสื้อแขนยาว ฐานปก", "เสื้อเชิ้ตแขนยาว"];
export const COLLAB_COLLECTIONS = ["Disney Collection", "งาน Fandom", "สามย่าน Mirttime", "Conโสดแห่งชาติ", "Cute Cute"];
export const HERO_COLLECTION = "Ultracool";

/** ลิงก์หน้ารวมสินค้า กรองได้หลายค่า (คั่นด้วย ,) และตั้งหัวข้อหน้าได้ */
export function productsHref(key: "category" | "collection", values: string[], title?: string): string {
  const u = new URLSearchParams({ [key]: values.join(",") });
  if (title && values.length > 1) u.set("title", title);
  return `/products?${u}`;
}

// เมนูหลัก (ชีต 02: เมนูหมวดหมู่และเมนูย่อย)
export const NAV = [
  { href: "/products", label: "สินค้าทั้งหมด" },
  { href: productsHref("category", ["เสื้อยืด"]), label: "เสื้อยืด" },
  { href: productsHref("category", ["เสื้อโปโล"]), label: "เสื้อโปโล" },
  { href: productsHref("category", LONG_SLEEVE_CATEGORIES, "เสื้อแขนยาว"), label: "แขนยาว" },
  { href: "/products?gender=WOMEN", label: "ผู้หญิง" },
  { href: "/products?gender=KIDS", label: "เด็ก" },
  { href: productsHref("collection", COLLAB_COLLECTIONS, "คอลแลบ"), label: "คอลแลบ" },
  { href: "/products?sort=popular", label: "ขายดี" },
  { href: "/products?sale=1", label: "Sale", accent: true },
];

// ไทล์หมวดหมู่หน้าแรก
export const CATEGORY_TILES = [
  { label: "เสื้อยืด", href: productsHref("category", ["เสื้อยืด"]) },
  { label: "เสื้อโปโล", href: productsHref("category", ["เสื้อโปโล"]) },
  { label: "เสื้อกีฬา", href: productsHref("category", ["เสื้อกีฬา"]) },
  { label: "ผู้หญิง", href: "/products?gender=WOMEN" },
  { label: "เด็ก", href: "/products?gender=KIDS" },
  { label: "คอลแลบ", href: productsHref("collection", COLLAB_COLLECTIONS, "คอลแลบ") },
];

// เมนูเนื้อหาแบรนด์ แยกจากเมนูสินค้า
export const NAV_BRAND = [
  { href: "/about", label: "ประวัติแบรนด์" },
  { href: "/blog", label: "บทความ" },
];
