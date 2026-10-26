import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // รูปสินค้าโหลดจากลิงก์ภายนอก (aliyuncs) โดยตรง
  images: { unoptimized: true },
  poweredByHeader: false,
  // อัปโหลดไฟล์ผ่าน server action ในหลังบ้าน (CSV สินค้า ~2MB, รายงานสต็อก JST) — ค่าเริ่มต้นของ Next คือ 1MB
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
};

export default nextConfig;
