import type { Metadata } from "next";
import Link from "next/link";
import { listProducts, GENDER_LABEL } from "@/lib/products";
import { parseListQuery, type SP } from "@/lib/query";
import { ProductCard } from "@/components/ProductCard";
import { Filters } from "@/components/Filters";

function heading(q: ReturnType<typeof parseListQuery>): string {
  if (q.q) return `ผลการค้นหา “${q.q}”`;
  if (q.sale) return "Sale";
  if (q.title) return q.title;
  if (q.category?.length === 1) return q.category[0];
  if (q.gender?.length === 1) return `สินค้า${GENDER_LABEL[q.gender[0]] ?? ""}`;
  if (q.collection?.length === 1) return q.collection[0];
  return "สินค้าทั้งหมด";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const q = parseListQuery(await searchParams);
  const title = heading(q);
  return {
    title,
    description: `${title} จาก Mynds เสื้อผ้าใส่สบายสำหรับอากาศร้อน เลือกสี ไซซ์ และราคาได้ตามต้องการ`,
    alternates: { canonical: q.category?.length === 1 ? `/products?category=${encodeURIComponent(q.category[0])}` : "/products" },
    robots: q.q || (q.page ?? 1) > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = parseListQuery(sp);
  const res = listProducts(q);
  const pageHref = (page: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v != null && k !== "page") u.set(k, Array.isArray(v) ? v.join(",") : v);
    if (page > 1) u.set("page", String(page));
    return `/products?${u}`;
  };

  return (
    <div className="container-x py-8">
      <nav className="mb-2 text-xs text-muted" aria-label="breadcrumb">
        <Link href="/">หน้าแรก</Link> / <span>{heading(q)}</span>
      </nav>
      <h1 className="text-3xl font-semibold">{heading(q)}</h1>
      <div className="mt-6 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        <Filters facets={res.facets} total={res.total} />
        <div>
          {res.items.length === 0 ? (
            <div className="rounded-2xl bg-soft p-10 text-center">
              <p className="font-medium">ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
              <p className="mt-1 text-sm text-muted">ลองค้นหาด้วยคำอื่น หรือล้างตัวกรองบางรายการ</p>
              <Link href="/products" className="btn-outline mt-4">ดูสินค้าทั้งหมด</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
              {res.items.map((p, i) => <ProductCard key={p.slug} p={p} priority={i < 6} />)}
            </div>
          )}
          {res.pages > 1 && (
            <nav className="mt-10 flex justify-center gap-1" aria-label="เปลี่ยนหน้า">
              {Array.from({ length: res.pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={pageHref(n)} aria-current={n === res.page ? "page" : undefined}
                  className={`grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm ${n === res.page ? "bg-ink text-white" : "hover:bg-soft"}`}>
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
