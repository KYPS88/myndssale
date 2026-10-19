import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { getSettings } from "@/lib/db";
import { RichText } from "@/components/RichText";

export const metadata: Metadata = { title: "ประวัติแบรนด์", description: site.positioning, alternates: { canonical: "/about" } };

// ใช้เมื่อยังไม่ได้เขียนประวัติแบรนด์ในหลังบ้าน (ตั้งค่าร้าน › ประวัติแบรนด์)
const DEFAULT_STORY = `${site.positioning}

เราเชื่อว่าเสื้อผ้าที่ดีสำหรับเมืองร้อน ต้องใส่แล้วรู้สึกเย็นสบายตั้งแต่ครั้งแรกที่สัมผัส ระบายอากาศได้ดี ดูแลง่าย และราคาที่ทุกคนจับต้องได้ ไม่ว่าจะใส่ไปทำงาน ออกกำลังกาย หรือทำกิจกรรมกลางแจ้ง`;

export default function AboutPage() {
  const story = getSettings().brand_story?.trim() || DEFAULT_STORY;
  return (
    <div className="container-x max-w-3xl py-14">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-tagline.png" alt="Mynds — Made for everyday" width={502} height={192} className="h-20 w-auto" />
      <p className="mt-8 text-sm uppercase tracking-[0.3em] text-ice">{site.tagline}</p>
      <h1 className="mt-2 text-4xl font-bold">ประวัติแบรนด์</h1>
      <RichText text={story} className="mt-6 text-lg" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {site.sellingPoints.map((s) => (
          <div key={s.title} className="rounded-2xl bg-soft p-5"><h2 className="font-semibold">{s.title}</h2><p className="mt-1 text-sm text-muted">{s.body}</p></div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/products" className="btn-primary">ช้อปคอลเลกชันทั้งหมด</Link>
        <Link href="/blog" className="btn-outline">อ่านบทความ</Link>
      </div>
    </div>
  );
}
