import Link from "next/link";
import { getAllProducts, sellable, toCard } from "@/lib/products";
import { site } from "@/lib/site";
import { ProductCard } from "@/components/ProductCard";
import { Img } from "@/components/Img";

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="container-x mt-16">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {href && <Link href={href} className="text-sm text-ice hover:underline">ดูทั้งหมด →</Link>}
      </div>
      {children}
    </section>
  );
}

const CATEGORY_TILES = [
  { label: "เสื้อยืด", href: "/products?category=เสื้อยืด" },
  { label: "เสื้อโปโล", href: "/products?category=เสื้อโปโล" },
  { label: "แขนยาว / กันแดด", href: "/products?category=เสื้อแขนยาว" },
  { label: "ผู้หญิง", href: "/products?gender=WOMEN" },
  { label: "เด็ก", href: "/products?gender=KIDS" },
  { label: "คอลแลบ", href: "/products?collection=Collaboration" },
];

export default function Home() {
  const products = getAllProducts().filter((p) => sellable(p).length);
  const cards = products.map(toCard).filter((c) => c.inStock);
  const best = [...cards].sort((a, b) => b.featured - a.featured || b.sold - a.sold || b.colors.length - a.colors.length).slice(0, 8);
  const sale = [...cards].sort((a, b) => b.discountPct - a.discountPct).slice(0, 4);
  const collab = cards.filter((c) => c.collection === "Collaboration").slice(0, 4);
  const tileImage = (href: string) => {
    const q = new URLSearchParams(href.split("?")[1]);
    const c = cards.find(
      (x) =>
        (!q.get("category") || x.category === q.get("category")) &&
        (!q.get("gender") || x.gender === q.get("gender")) &&
        (!q.get("collection") || x.collection === q.get("collection")),
    );
    return c?.image ?? "/placeholder.svg";
  };

  return (
    <>
      {/* Hero — เปลี่ยนเป็นรูป HOME-HERO-01 / HOME-HERO-M-01 เมื่อได้ไฟล์จากทีมครีเอทีฟ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#e9f3fa] via-white to-[#f3f8fb]">
        <div className="container-x grid items-center gap-10 py-14 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-ice">{site.tagline}</p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              เย็นตั้งแต่
              <br />
              ครั้งแรกที่สัมผัส
            </h1>
            <p className="max-w-md text-lg text-muted">{site.positioning} — ออกแบบมาเพื่ออากาศร้อนของเมืองไทยโดยเฉพาะ</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary px-7 py-3">ช้อปเลย</Link>
              <Link href="/products?collection=Ultra%20Cool" className="btn-outline px-7 py-3">คอลเลกชัน Ultra Cool</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {best.slice(0, 4).map((c, i) => (
              <Link key={c.slug} href={`/products/${c.slug}`} className={`overflow-hidden rounded-2xl bg-soft ${i % 2 ? "translate-y-6" : ""}`}>
                <Img src={c.image} alt={c.name} className="aspect-[4/5] w-full object-cover" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x mt-12 grid gap-4 sm:grid-cols-3">
        {site.sellingPoints.map((s) => (
          <div key={s.title} className="rounded-2xl bg-soft p-5">
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      <Section title="ช้อปตามหมวดหมู่">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_TILES.map((t) => (
            <Link key={t.href} href={t.href} className="group relative overflow-hidden rounded-xl bg-soft">
              <Img src={tileImage(t.href)} alt="" loading="lazy" className="aspect-square w-full object-cover transition group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-sm font-semibold text-white">{t.label}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="สินค้าขายดี" href="/products?sort=popular">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {best.map((p, i) => <ProductCard key={p.slug} p={p} priority={i < 4} />)}
        </div>
      </Section>

      {sale.length > 0 && sale[0].discountPct > 0 && (
        <Section title="ราคาพิเศษ" href="/products?sale=1&sort=discount">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {sale.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        </Section>
      )}

      {collab.length > 0 && (
        <Section title="Mynds × Collaboration" href="/products?collection=Collaboration">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {collab.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        </Section>
      )}

      <section className="container-x mt-16">
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-ink p-8 text-white md:flex-row md:items-center md:p-12">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">มีคำถามเรื่องไซซ์หรือสินค้า?</h2>
            <p className="mt-1 text-white/70">ทักแอดมินทาง LINE {site.contact.lineId} ตอบไว {site.contact.hours}</p>
          </div>
          <a href={site.contact.lineUrl} target="_blank" rel="noopener" className="btn bg-[#06c755] px-7 py-3 text-white">แชทกับเรา</a>
        </div>
      </section>
    </>
  );
}
