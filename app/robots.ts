import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // ตั้ง NEXT_PUBLIC_NOINDEX=1 บน staging เพื่อกันไม่ให้ถูก index
  if (process.env.NEXT_PUBLIC_NOINDEX === "1") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout", "/order", "/track"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
