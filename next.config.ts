import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // รูปสินค้าโหลดจากลิงก์ภายนอก (aliyuncs) โดยตรง
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
