import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, listArticles, thaiDate } from "@/lib/articles";
import { RichText } from "@/components/RichText";
import { Img } from "@/components/Img";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = getArticleBySlug(decodeURIComponent((await params).slug));
  if (!a) return { title: "ไม่พบบทความ" };
  return {
    title: a.title,
    description: a.excerpt ?? undefined,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: { title: a.title, description: a.excerpt ?? undefined, type: "article", images: a.cover_image ? [a.cover_image] : ["/brand/og.png"] },
  };
}

export default async function ArticlePage({ params }: P) {
  const a = getArticleBySlug(decodeURIComponent((await params).slug));
  if (!a) notFound();
  const more = listArticles().filter((x) => x.id !== a.id).slice(0, 3);
  return (
    <article className="container-x max-w-3xl py-12">
      <nav className="mb-4 text-xs text-muted" aria-label="breadcrumb">
        <Link href="/">หน้าแรก</Link> / <Link href="/blog">บทความ</Link>
      </nav>
      <h1 className="text-3xl font-bold leading-tight md:text-4xl">{a.title}</h1>
      <p className="mt-2 text-sm text-muted">{thaiDate(a.published_at)}</p>
      {a.cover_image && <Img src={a.cover_image} alt="" className="mt-8 w-full rounded-2xl" />}
      <RichText text={a.body} className="mt-8 text-[17px]" />
      <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8">
        <Link href="/products" className="btn-primary">ช้อปสินค้า Mynds</Link>
        <Link href="/blog" className="btn-outline">บทความทั้งหมด</Link>
      </div>
      {more.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-semibold">บทความอื่น ๆ</h2>
          <ul className="space-y-3">
            {more.map((m) => (
              <li key={m.id}><Link href={`/blog/${m.slug}`} className="hover:text-ice">{m.title}</Link></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
