import { parseBody } from "@/lib/articles";

/** แสดงข้อความแบบง่าย (ย่อหน้า / ## หัวข้อ / - รายการ) โดยไม่ใช้ HTML จากผู้ใช้ */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-4 leading-8 text-ink/80 ${className}`}>
      {parseBody(text).map((b, i) =>
        b.type === "h2" ? (
          <h2 key={i} className="pt-4 text-xl font-semibold text-ink">{b.text}</h2>
        ) : b.type === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}
