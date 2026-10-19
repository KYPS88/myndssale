import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/articles";
import { deleteArticle, saveArticle } from "../../../actions";

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const isNew = id === "new";
  const a = isNew ? null : getArticleById(Number(id));
  if (!isNew && !a) notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/articles" className="text-sm text-muted underline">← บทความทั้งหมด</Link>
        {a?.published ? <Link href={`/blog/${a.slug}`} target="_blank" className="text-sm text-ice underline">ดูหน้าเว็บ ↗</Link> : null}
      </div>
      <h1 className="text-2xl font-semibold">{isNew ? "เขียนบทความใหม่" : "แก้ไขบทความ"}</h1>
      {saved && <p className="rounded-lg bg-ice-light p-3 text-sm text-ice-dark">บันทึกแล้ว</p>}
      {error && <p className="rounded-lg bg-sale/10 p-3 text-sm text-sale">{error}</p>}
      <form action={saveArticle} className="card space-y-4 p-6">
        {a && <input type="hidden" name="id" value={a.id} />}
        <div><label className="label" htmlFor="title">ชื่อบทความ *</label><input id="title" name="title" defaultValue={a?.title} className="input" required /></div>
        <div>
          <label className="label" htmlFor="slug">ลิงก์บทความ (slug)</label>
          <div className="flex items-center gap-2 text-sm text-muted">/blog/<input id="slug" name="slug" defaultValue={a?.slug} className="input" placeholder="เว้นว่าง = สร้างจากชื่อบทความ" /></div>
        </div>
        <div><label className="label" htmlFor="excerpt">คำโปรย (แสดงในหน้ารวมบทความ และตอนแชร์ลิงก์)</label><textarea id="excerpt" name="excerpt" defaultValue={a?.excerpt ?? ""} rows={2} className="input" /></div>
        <div><label className="label" htmlFor="cover_image">รูปปก (ลิงก์รูป https://...)</label><input id="cover_image" name="cover_image" defaultValue={a?.cover_image ?? ""} className="input" placeholder="เว้นว่างได้" /></div>
        <div>
          <label className="label" htmlFor="body">เนื้อหา *</label>
          <p className="mb-1 text-xs text-muted">เว้นบรรทัด = ย่อหน้าใหม่ · ขึ้นต้นบรรทัดด้วย “## ” = หัวข้อ · “- ” = รายการ</p>
          <textarea id="body" name="body" defaultValue={a?.body} rows={18} className="input leading-7" required />
        </div>
        <fieldset className="flex gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="published" value="1" defaultChecked={!!a?.published} /> เผยแพร่</label>
          <label className="flex items-center gap-2"><input type="radio" name="published" value="0" defaultChecked={!a?.published} /> ฉบับร่าง (ยังไม่แสดงบนเว็บ)</label>
        </fieldset>
        <button className="btn-primary">บันทึก</button>
      </form>
      {a && (
        <form action={deleteArticle} className="flex items-center justify-end gap-3 text-sm">
          <input type="hidden" name="id" value={a.id} />
          <label className="flex items-center gap-1 text-muted"><input type="checkbox" required /> ยืนยันลบ</label>
          <button className="text-sale underline">ลบบทความนี้</button>
        </form>
      )}
    </div>
  );
}
