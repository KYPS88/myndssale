// สีสำหรับ swatch — ชื่อสีมาจากชีต ถ้าไม่รู้จักจะแสดงเป็นสีเทาพร้อมชื่อ
const MAP: Record<string, string> = {
  black: "#111111", white: "#ffffff", cream: "#f3ead8", ivory: "#f6f1e3", beige: "#d9c7a7", butter: "#f3e2a0",
  "soft butter": "#f5e7b4", gray: "#9ca3af", grey: "#9ca3af", "dark gray": "#4b5563", "dark grey": "#4b5563",
  "light gray": "#d1d5db", "soft gray": "#cfd4d9", "smoke gray": "#8b929a", charcoal: "#36393d", "gray cement": "#8c8c88",
  "menthol dark grey": "#4a5257", siemens: "#8c8c88", metal: "#6b7177", navy: "#1e2a44", "dark blue": "#1f3a63",
  blue: "#2f6fb2", "sky blue": "#8ec9ec", "soft blue": "#b9d4ea", bluepastel: "#bcd8f0", "royal blue": "#2747a8",
  "classic blue": "#2c4f86", "steel blue": "#4f7697", green: "#2f8f4e", "soft green": "#b7d8b5", softgreen: "#b7d8b5",
  greenpastel: "#c3e3c2", "mint green": "#9fdcc5", mint: "#a8e0cc", "earth green": "#6b7a4f", earthgreen: "#6b7a4f",
  "emerald green": "#1d7a5a", "forest green": "#2d5136", "moss green": "#68733f", avocado: "#7d8b4a", pink: "#e98aa6",
  "soft pink": "#f5c6d3", softpink: "#f5c6d3", pinkpastel: "#f7cdd8", purplepastel: "#d7c6ec", violet: "#7b5ea7",
  plum: "#8e4585", "deep plum": "#5a2a52", red: "#c0392b", "red burgundy": "#7a2331", burgundy: "#7a2331",
  maroon: "#6d2632", orange: "#ec7a2c", yellow: "#f4cf3a", brown: "#7a5236", "dark brown": "#4a3022",
  "soft brown": "#b08a6a", chocolate: "#5a3a26", mocca: "#8a6a50", "moss brown": "#6e5b3e", "gloden brown": "#a8742f",
  khaki: "#bfae82", kaki: "#bfae82", oatmeal: "#e3d6bf", latte: "#c8a682", thaitea: "#d98a4b", ovaltine: "#8b5e3c",
  topdie: "#a9b7c6", "สีดำ": "#111111", ดำ: "#111111", ขาว: "#ffffff", กรมท่า: "#1e2a44", กากี: "#bfae82",
  ข้าวโอ๊ต: "#e3d6bf", ช็อคโกแลต: "#5a3a26", เทาซีเมนต์: "#8c8c88", เบอร์กันดี: "#7a2331", เบอร์กันนดี: "#7a2331",
  เมทอล: "#6b7177",
};

function one(name: string): string | null {
  const k = name.toLowerCase().trim().replace(/\d+$/, "");
  if (MAP[k]) return MAP[k];
  if (/bk$/.test(k)) return MAP.black;
  if (/wh$/.test(k)) return MAP.white;
  return null;
}

/** CSS background for a swatch; two-tone colors ("Black/White") are split diagonally. */
export function swatchBackground(color: string): string {
  const parts = color.split("/").map((c) => one(c) ?? "#c7ccd1");
  if (parts.length >= 2) return `linear-gradient(135deg, ${parts[0]} 50%, ${parts[1]} 50%)`;
  return parts[0];
}
