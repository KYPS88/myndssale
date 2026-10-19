import type { Metadata } from "next";
import Link from "next/link";
import { listArticles, thaiDate } from "@/lib/articles";
import { Img } from "@/components/Img";

export const metadata: Metadata = {
  title: "บทความ",
  description: "บทความจาก Mynds: เคล็ดลับแต่งตัวรับอากาศร้อน วิธีดูแลเสื้อผ้า และข่าวสารแบรนด์",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const articles = listArticles();
  return (
    <div className="container-x py-12">
      <h1 className="text-3xl font-semibold">บทความ</h1>
      <p className="mt-1 text-muted">เคล็ดลับแต่งตัวรับอากาศร้อน การดูแลเสื้อผ้า และเรื่องราวจาก Mynds</p>
      {articles.length === 0 ? (
        <p className="mt-16 text-center text-muted">ยังไม่มีบทความ</p>
      ) : (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link key={a.id} href={`/blog/${a.slug}`} className="group block">
              <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-ice-light">
                {a.cover_image ? (
                  <Img src={a.cover_image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="grid h-full place-items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/logo.png" alt="" className="w-1/3 opacity-80" />
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-muted">{thaiDate(a.published_at)}</p>
              <h2 className="mt-1 text-lg font-semibold leading-snug group-hover:text-ice">{a.title}</h2>
              {a.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted">{a.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
