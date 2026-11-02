import Link from "next/link";
import { getDb } from "@/lib/db";
import { bangkokDay, dailyReport, lineClicksByPlace, topProducts, totals, type DayRow } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90];

const PLACE_LABEL: Record<string, string> = {
  product: "ปุ่ม “สั่งซื้อทาง LINE” หน้าสินค้า",
  "product-chat": "กล่อง “สอบถามไซซ์” หน้าสินค้า",
  header: "ปุ่ม LINE แถบด้านบน",
  footer: "ปุ่ม LINE ท้ายเว็บ",
  home: "ปุ่ม “แชทกับเรา” หน้าแรก",
  faq: "หน้าคำถามที่พบบ่อย",
  "size-guide": "หน้าวิธีเลือกไซซ์",
  "cart-page": "หน้าตะกร้า",
  "order-page": "หน้าสถานะออเดอร์",
  other: "อื่น ๆ",
};

const n = (v: number) => (v ?? 0).toLocaleString("th-TH");
const thaiDay = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const to = bangkokDay();
  const from = bangkokDay(new Date(Date.now() - (days - 1) * 86400_000));
  const db = getDb();

  const byDay = new Map(dailyReport(db, from, to).map((r) => [r.day, r]));
  const rows: DayRow[] = [];
  for (let i = 0; i < days; i++) {
    const day = bangkokDay(new Date(Date.now() - i * 86400_000));
    rows.push(byDay.get(day) ?? { day, visitors: 0, pageviews: 0, productViews: 0, lineClicks: 0, lineVisitors: 0 });
  }
  const t = totals(rows);
  const today = rows[0];
  const products = topProducts(db, from, to);
  const places = lineClicksByPlace(db, from, to);
  const max = Math.max(1, ...rows.map((r) => r.visitors));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">สถิติผู้เข้าชม</h1>
        <div className="ml-auto flex gap-2">
          {RANGES.map((d) => (
            <Link key={d} href={`/admin/analytics?days=${d}`} className={`rounded-full px-4 py-1.5 text-sm ${d === days ? "bg-ink text-white" : "bg-white shadow-sm"}`}>
              {d} วัน
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="ผู้เข้าชมวันนี้" value={today.visitors} sub={`เปิดดู ${n(today.pageviews)} หน้า`} />
        <Tile label={`ผู้เข้าชม ${days} วัน`} value={t.visitors} sub={`เฉลี่ย ${n(Math.round(t.visitors / days))} คน/วัน`} />
        <Tile label={`ดูหน้าสินค้า ${days} วัน`} value={t.productViews} sub="ครั้ง" />
        <Tile label={`กดไป LINE ${days} วัน`} value={t.lineVisitors} sub={`คน (กดทั้งหมด ${n(t.lineClicks)} ครั้ง)`} />
      </div>

      <p className="rounded-lg bg-soft p-3 text-xs text-muted">
        นับเอง ไม่ใช้คุกกี้ และไม่เก็บข้อมูลส่วนตัว · “ผู้เข้าชม” = จำนวนคน (เครื่อง) ต่อวัน คนเดียวกันมา 2 วันนับ 2 · ไม่นับบอท/Google
        · “กดไป LINE” คือจำนวนคนที่กดลิงก์แอดไลน์จากเว็บ — ยอด<b>แอดเพื่อนสำเร็จจริง</b>ดูที่ LINE Official Account Manager › สถิติ › เพื่อน
      </p>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card overflow-x-auto p-0 lg:col-span-3">
          <h2 className="p-4 font-semibold">รายวัน</h2>
          <table className="w-full text-sm">
            <thead className="bg-soft text-left">
              <tr><th className="p-2 pl-4">วันที่</th><th className="p-2">ผู้เข้าชม</th><th className="p-2 text-right">เปิดหน้า</th><th className="p-2 text-right">ดูสินค้า</th><th className="p-2 pr-4 text-right">กดไป LINE (คน)</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.day}>
                  <td className="whitespace-nowrap p-2 pl-4">{thaiDay(r.day)}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="w-10 text-right font-medium">{n(r.visitors)}</span>
                      <span className="h-2 rounded bg-ice" style={{ width: `${(r.visitors / max) * 120}px` }} />
                    </div>
                  </td>
                  <td className="p-2 text-right">{n(r.pageviews)}</td>
                  <td className="p-2 text-right">{n(r.productViews)}</td>
                  <td className="p-2 pr-4 text-right font-medium text-[#06a648]">{n(r.lineVisitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card p-0">
            <h2 className="p-4 font-semibold">กดไป LINE จากจุดไหน</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {places.map((p) => (
                  <tr key={p.place}><td className="p-2 pl-4">{PLACE_LABEL[p.place] ?? p.place}</td><td className="p-2 pr-4 text-right">{n(p.visitors)} คน · {n(p.clicks)} ครั้ง</td></tr>
                ))}
                {!places.length && <tr><td className="p-4 text-muted">ยังไม่มีข้อมูล</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <h2 className="p-4 font-semibold">สินค้าที่มีคนดู ({days} วัน)</h2>
        <table className="w-full text-sm">
          <thead className="bg-soft text-left">
            <tr><th className="p-2 pl-4">#</th><th className="p-2">สินค้า</th><th className="p-2 text-right">ดู (ครั้ง)</th><th className="p-2 text-right">คนดู</th><th className="p-2 pr-4 text-right">กดสั่งทาง LINE</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p, i) => (
              <tr key={p.slug}>
                <td className="p-2 pl-4 text-muted">{i + 1}</td>
                <td className="p-2"><Link href={`/products/${p.slug}`} target="_blank" className="hover:underline">{p.name ?? p.slug}</Link></td>
                <td className="p-2 text-right">{n(p.views)}</td>
                <td className="p-2 text-right">{n(p.viewers)}</td>
                <td className="p-2 pr-4 text-right font-medium text-[#06a648]">{n(p.lineOrders)}</td>
              </tr>
            ))}
            {!products.length && <tr><td colSpan={5} className="p-4 text-muted">ยังไม่มีข้อมูล</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{n(value)}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}
