import type { MetadataRoute } from "next";
import { getAllProducts, sellable } from "@/lib/products";
import { POLICIES } from "@/lib/policies";
import { listArticles } from "@/lib/articles";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string) => `${site.url}${p}`;
  const products = getAllProducts().filter((p) => sellable(p).length);
  const categories = [...new Set(products.map((p) => p.category))];
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/products"), changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: u(`/products?category=${encodeURIComponent(c)}`), priority: 0.8 })),
    ...products.map((p) => ({ url: u(`/products/${p.slug}`), lastModified: new Date(p.created_at + "Z"), priority: 0.7 })),
    ...["/about", "/blog", "/faq", "/size-guide"].map((p) => ({ url: u(p), priority: 0.5 })),
    ...listArticles().map((a) => ({ url: u(`/blog/${encodeURIComponent(a.slug)}`), lastModified: new Date(a.updated_at.replace(" ", "T") + "Z"), priority: 0.5 })),
    ...Object.keys(POLICIES).map((k) => ({ url: u(`/policies/${k}`), priority: 0.2 })),
  ];
}
