import Link from "next/link";
import { listArticles, thaiDate } from "@/lib/articles";

export default function AdminArticles() {
  const rows = listArticles({ includeDrafts: true });
  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h1 className="text-2xl font-semibold">บทความ ({rows.length})</h1>
        <Link href="/admin/articles/new" className="btn-primary ml-auto">+ เขียนบทความใหม่</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left"><tr><th className="p-3">ชื่อบทความ</th><th className="p-3">เผยแพร่เมื่อ</th><th className="p-3">สถานะ</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="p-3"><Link href={`/admin/articles/${a.id}`} className="font-medium text-ice underline">{a.title}</Link><br /><span className="text-xs text-muted">/blog/{a.slug}</span></td>
                <td className="p-3 whitespace-nowrap">{thaiDate(a.published_at) || "—"}</td>
                <td className="p-3">{a.published ? "เผยแพร่" : <span className="text-muted">ฉบับร่าง</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted">ยังไม่มีบทความ</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
