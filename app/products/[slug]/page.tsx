import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, relatedProducts, sellable, GENDER_LABEL } from "@/lib/products";
import { sizeRank } from "@/lib/catalog";
import { getSettings } from "@/lib/db";
import { site } from "@/lib/site";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductCard } from "@/components/ProductCard";
import { Img } from "@/components/Img";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getProductBySlug((await params).slug);
  if (!p) return { title: "ไม่พบสินค้า" };
  const vs = sellable(p);
  const min = Math.min(...vs.map((v) => v.price));
  const description =
    p.seo_description ??
    p.short_description ??
    `${p.name} ราคาเริ่มต้น ฿${min.toLocaleString("th-TH")} มี ${new Set(vs.map((v) => v.color)).size} สี ไซซ์ ${[...new Set(vs.map((v) => v.size))].join(" ")} — Mynds เสื้อผ้าใส่สบายสำหรับอากาศร้อน`;
  const image = vs.find((v) => v.image)?.image ?? p.images[0];
  return {
    title: p.seo_title ?? p.name,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description, images: image ? [image] : [], type: "website" },
  };
}

export default async function ProductPage({ params }: Params) {
  const p = getProductBySlug((await params).slug);
  if (!p) notFound();
  const vs = sellable(p);
  if (!vs.length) notFound();
  const settings = getSettings();
  const sizes = [...new Set(vs.map((v) => v.size))].sort((a, b) => sizeRank(a) - sizeRank(b));
  const related = relatedProducts(p);
  const prices = vs.map((v) => v.price);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    brand: { "@type": "Brand", name: site.name },
    image: [...new Set([...vs.map((v) => v.image), ...p.images].filter(Boolean))].slice(0, 8),
    description: p.description ?? p.short_description ?? p.name,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "THB",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: vs.length,
      availability: vs.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const details: [string, string | null][] = [
    ["รายละเอียดสินค้า", p.description ?? p.short_description],
    ["จุดเด่น", p.features],
    ["วัสดุ / ส่วนผสม", p.material],
    ["ทรง / ฟิต", p.fit],
    ["วิธีดูแล", p.care],
  ];

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-4 text-xs text-muted" aria-label="breadcrumb">
        <Link href="/">หน้าแรก</Link> / <Link href={`/products?category=${encodeURIComponent(p.category)}`}>{p.category}</Link> / <span>{p.name}</span>
      </nav>
      <ProductDetail
        p={{ slug: p.slug, sku: p.sku, name: p.name, images: p.images, sizes, variants: vs.map(({ id, sku, color, size, price, compare_at, stock, image }) => ({ id, sku, color, size, price, compare_at, stock, image })) }}
        lineUrl={site.contact.lineUrl}
      />

      <section className="mt-12 grid gap-8 md:grid-cols-2 lg:gap-14">
        <div className="divide-y divide-line border-y border-line">
          {details.map(([title, body]) => (
            <details key={title} className="group py-4" open={title === "รายละเอียดสินค้า"}>
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {title}
                <span className="transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink/80">
                {body ??
                  (title === "รายละเอียดสินค้า"
                    ? `${p.name} จากคอลเลกชัน ${p.collection ?? "Mynds"} เหมาะสำหรับ${GENDER_LABEL[p.gender] === "Unisex" ? "ทุกเพศ" : GENDER_LABEL[p.gender]} ออกแบบมาเพื่อใส่สบายในอากาศร้อนของเมืองไทย`
                    : "ข้อมูลกำลังอัปเดต สอบถามเพิ่มเติมได้ทาง LINE " + site.contact.lineId)}
              </p>
            </details>
          ))}
          <details className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
              การจัดส่งและการเปลี่ยนสินค้า <span className="transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-7 text-ink/80">
              {settings.shipping_note} <Link href="/policies/returns" className="text-ice underline">อ่านนโยบายการเปลี่ยน/คืนสินค้า</Link>
            </p>
          </details>
        </div>
        {p.size_chart_url && (
          <Img src={p.size_chart_url} alt={`ตารางไซซ์ ${p.name}`} className="w-full rounded-2xl border border-line" loading="lazy" />
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-semibold">สินค้าที่คุณอาจชอบ</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((r) => <ProductCard key={r.slug} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
