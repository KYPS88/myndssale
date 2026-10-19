import type { DatabaseSync } from "node:sqlite";
import { getDb } from "./db.ts";

export type Article = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  body: string;
  published: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Block = { type: "h2" | "p"; text: string } | { type: "ul"; items: string[] };

/**
 * เนื้อหาบทความเป็นข้อความธรรมดา: เว้นบรรทัด = ย่อหน้าใหม่, ขึ้นต้นด้วย "## " = หัวข้อ, "- " = รายการ
 * (ไม่รับ HTML เพื่อกันสคริปต์แปลกปลอม)
 */
export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    let para: string[] = [];
    const flush = () => {
      if (para.length) blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    };
    for (const line of lines) {
      if (line.startsWith("## ")) {
        flush();
        blocks.push({ type: "h2", text: line.slice(3).trim() });
      } else if (/^[-•*] /.test(line)) {
        flush();
        const last = blocks[blocks.length - 1];
        const item = line.slice(2).trim();
        if (last && last.type === "ul") last.items.push(item);
        else blocks.push({ type: "ul", items: [item] });
      } else para.push(line);
    }
    flush();
  }
  return blocks;
}

/** "2026-10-19 08:00:00" (UTC จาก SQLite) → "19 ตุลาคม 2569" */
export function thaiDate(s: string | null): string {
  return s ? new Date(s.replace(" ", "T") + "Z").toLocaleDateString("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }) : "";
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9฀-๿-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function listArticles(opts: { includeDrafts?: boolean } = {}, db = getDb()): Article[] {
  return db
    .prepare(
      `SELECT * FROM articles ${opts.includeDrafts ? "" : "WHERE published = 1"}
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC`,
    )
    .all() as Article[];
}

export function getArticleBySlug(slug: string, opts: { includeDrafts?: boolean } = {}, db = getDb()): Article | null {
  const a = db.prepare("SELECT * FROM articles WHERE slug = ?").get(slug) as Article | undefined;
  if (!a || (!opts.includeDrafts && !a.published)) return null;
  return a;
}

export function getArticleById(id: number, db = getDb()): Article | null {
  return (db.prepare("SELECT * FROM articles WHERE id = ?").get(id) as Article | undefined) ?? null;
}

export type ArticleInput = {
  id?: number;
  title: string;
  slug?: string;
  excerpt?: string | null;
  coverImage?: string | null;
  body: string;
  published: boolean;
};

export function saveArticle(input: ArticleInput, db = getDb()): Article {
  const title = input.title.trim().slice(0, 200);
  if (!title) throw new Error("กรุณาใส่ชื่อบทความ");
  const slug = slugify(input.slug || title);
  if (!slug) throw new Error("ลิงก์บทความ (slug) ไม่ถูกต้อง");
  const clash = db.prepare("SELECT id FROM articles WHERE slug = ?").get(slug) as { id: number } | undefined;
  if (clash && clash.id !== input.id) throw new Error("มีบทความอื่นใช้ลิงก์นี้แล้ว");
  const cover = input.coverImage?.trim() || null;
  if (cover && !/^(https?:\/\/|\/)/.test(cover)) throw new Error("ลิงก์รูปปกต้องขึ้นต้นด้วย https://");
  const fields = [title, slug, input.excerpt?.trim() || null, cover, input.body.trim(), input.published ? 1 : 0] as const;

  if (input.id) {
    const prev = getArticleById(input.id, db);
    if (!prev) throw new Error("ไม่พบบทความ");
    db.prepare(
      `UPDATE articles SET title=?, slug=?, excerpt=?, cover_image=?, body=?, published=?,
         published_at = CASE WHEN ?6 = 1 AND published_at IS NULL THEN datetime('now') ELSE published_at END,
         updated_at = datetime('now') WHERE id = ?`,
    ).run(...fields, input.id);
    return getArticleById(input.id, db)!;
  }
  const r = db
    .prepare(
      `INSERT INTO articles (title, slug, excerpt, cover_image, body, published, published_at)
       VALUES (?,?,?,?,?,?, CASE WHEN ?6 = 1 THEN datetime('now') END)`,
    )
    .run(...fields);
  return getArticleById(Number(r.lastInsertRowid), db)!;
}

export function deleteArticle(id: number, db = getDb()) {
  db.prepare("DELETE FROM articles WHERE id = ?").run(id);
}

/** บทความตั้งต้น 3 เรื่อง (ใส่ครั้งเดียวตอนสร้างฐานข้อมูล — ลบ/แก้ได้ในหลังบ้าน) */
export function seedArticles(db: DatabaseSync) {
  const done = db.prepare("SELECT value FROM settings WHERE key = 'articles_seeded'").get();
  if (done) return;
  const n = (db.prepare("SELECT COUNT(*) AS n FROM articles").get() as { n: number }).n;
  if (n === 0) {
    for (const a of STARTER_ARTICLES) {
      saveArticle({ ...a, published: true }, db);
    }
  }
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('articles_seeded', '1')").run();
}

const STARTER_ARTICLES: Omit<ArticleInput, "published">[] = [
  {
    title: "แต่งตัวยังไงให้เย็นสบายในวันที่อากาศร้อน",
    slug: "dress-cool-in-hot-weather",
    excerpt: "เคล็ดลับเลือกเสื้อผ้า สี และทรง ให้ใส่สบายตลอดวันแม้แดดแรง",
    body: `อากาศเมืองไทยร้อนเกือบทั้งปี การเลือกเสื้อผ้าให้เหมาะช่วยให้สบายตัวขึ้นได้มาก

## เลือกผ้าที่ระบายอากาศได้ดี
ผ้าที่ระบายความร้อนและแห้งไวช่วยให้ไม่รู้สึกเหนียวตัว โดยเฉพาะเวลาต้องเดินกลางแจ้งหรือออกกำลังกาย

## เลือกสีให้เหมาะกับแดด
- สีอ่อน เช่น ขาว ครีม ฟ้าพาสเทล สะท้อนแสงได้ดี
- สีเข้มเหมาะกับวันที่อยู่ในร่มหรือช่วงเย็น

## เลือกทรงที่ไม่รัดเกินไป
ทรงที่มีพื้นที่ให้อากาศไหลผ่าน เช่น ทรงปกติหรือโอเวอร์ไซซ์ ช่วยให้ใส่สบายกว่าทรงที่แนบตัวมาก

ไม่แน่ใจว่าตัวไหนเหมาะกับคุณ ทักแอดมินทาง LINE ได้เลย`,
  },
  {
    title: "วิธีดูแลเสื้อให้ใช้ได้นาน สีไม่ซีด ทรงไม่เสีย",
    slug: "how-to-care-for-your-tee",
    excerpt: "ซัก ตาก รีด อย่างไรให้เสื้อตัวโปรดอยู่กับคุณไปนาน ๆ",
    body: `เสื้อที่ดูแลถูกวิธีจะคงสีและทรงได้นานกว่าเดิมมาก

## การซัก
- กลับด้านเสื้อก่อนซัก โดยเฉพาะเสื้อที่มีลายสกรีน
- ซักน้ำเย็นหรือน้ำอุณหภูมิห้อง
- แยกผ้าสีเข้มกับสีอ่อน

## การตาก
ตากในที่ร่มที่ลมผ่าน หลีกเลี่ยงแดดจัดโดยตรงเป็นเวลานานเพื่อลดการซีดของสี

## การรีด
ใช้ความร้อนต่ำถึงปานกลาง และไม่รีดทับลายสกรีนโดยตรง

อ่านวิธีดูแลเฉพาะของแต่ละรุ่นได้ที่หน้าสินค้า`,
  },
  {
    title: "เลือกไซซ์เสื้อยังไงให้พอดีตัว",
    slug: "how-to-choose-your-size",
    excerpt: "วัดตัวง่าย ๆ ด้วยเสื้อตัวที่ใส่สบายที่สุดของคุณ",
    body: `วิธีที่ง่ายที่สุดคือใช้เสื้อตัวที่คุณใส่แล้วพอดีที่สุดเป็นตัวเทียบ

## วัดรอบอก
วางเสื้อราบกับพื้น วัดจากใต้รักแร้ด้านหนึ่งไปอีกด้าน แล้วคูณ 2 จะได้รอบอกโดยประมาณ

## วัดความยาว
วัดจากจุดสูงสุดของบ่า (ข้างคอ) ลงมาถึงชายเสื้อ

## เทียบกับตารางไซซ์
นำตัวเลขที่ได้ไปเทียบกับตารางไซซ์ของแต่ละรุ่นในหน้าสินค้า หากอยู่ระหว่างสองไซซ์ ชอบใส่หลวมให้เลือกไซซ์ใหญ่กว่า

ยังไม่แน่ใจ ส่งส่วนสูงและน้ำหนักให้แอดมินช่วยเลือกได้ทาง LINE`,
  },
];
