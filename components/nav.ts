// เมนูหลัก (ชีต 02: เมนูหมวดหมู่และเมนูย่อย)
export const NAV = [
  { href: "/products", label: "สินค้าทั้งหมด" },
  { href: "/products?category=เสื้อยืด", label: "เสื้อยืด" },
  { href: "/products?category=เสื้อโปโล", label: "เสื้อโปโล" },
  { href: "/products?category=เสื้อแขนยาว", label: "แขนยาว" },
  { href: "/products?gender=WOMEN", label: "ผู้หญิง" },
  { href: "/products?gender=KIDS", label: "เด็ก" },
  { href: "/products?collection=Collaboration", label: "คอลแลบ" },
  { href: "/products?sort=popular", label: "ขายดี" },
  { href: "/products?sale=1", label: "Sale", accent: true },
];

// เมนูเนื้อหาแบรนด์ แยกจากเมนูสินค้า
export const NAV_BRAND = [
  { href: "/about", label: "ประวัติแบรนด์" },
  { href: "/blog", label: "บทความ" },
];
