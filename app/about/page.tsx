import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "เรื่องราวของ Mynds", description: site.positioning };

export default function AboutPage() {
  return (
    <div className="container-x max-w-3xl py-14">
      <p className="text-sm uppercase tracking-[0.3em] text-ice">{site.tagline}</p>
      <h1 className="mt-2 text-4xl font-bold">Mynds — {site.nameTh}</h1>
      <p className="mt-6 text-lg leading-8 text-ink/80">{site.positioning}</p>
      {/* TODO: ใส่ประวัติแบรนด์ (ชีต 01 ยังว่าง) */}
      <p className="mt-4 leading-8 text-ink/80">
        เราเชื่อว่าเสื้อผ้าที่ดีสำหรับเมืองร้อน ต้องใส่แล้วรู้สึกเย็นสบายตั้งแต่ครั้งแรกที่สัมผัส ระบายอากาศได้ดี ดูแลง่าย
        และราคาที่ทุกคนจับต้องได้ — ไม่ว่าจะใส่ไปทำงาน ออกกำลังกาย หรือทำกิจกรรมกลางแจ้ง
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {site.sellingPoints.map((s) => (
          <div key={s.title} className="rounded-2xl bg-soft p-5"><h2 className="font-semibold">{s.title}</h2><p className="mt-1 text-sm text-muted">{s.body}</p></div>
        ))}
      </div>
      <Link href="/products" className="btn-primary mt-10">ช้อปคอลเลกชันทั้งหมด</Link>
    </div>
  );
}
