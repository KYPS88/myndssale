// สถิติผู้เข้าชมเว็บ เก็บในฐานข้อมูลของเราเอง (ไม่ใช้คุกกี้ ไม่เก็บ IP หรือข้อมูลส่วนตัว)
// ผู้เข้าชม 1 คน/วัน = hash(salt ประจำวัน + IP + browser) — salt เปลี่ยนทุกวันและไม่เก็บของเก่า
// จึงย้อนกลับเป็น IP ไม่ได้ และนับซ้ำข้ามวันไม่ได้ (แบบเดียวกับ Plausible)
import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export const EVENT_TYPES = ["pageview", "line_click", "line_order"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|whatsapp|curl|wget|python|axios|node-fetch|go-http/i;
const MAX_EVENTS_PER_VISITOR_DAY = 300;
const KEEP_DAYS = 400;

/** วันที่ตามเวลาไทย (YYYY-MM-DD) */
export function bangkokDay(d = new Date()): string {
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function isBot(ua: string): boolean {
  return !ua || BOT_UA.test(ua);
}

function dailySalt(db: DatabaseSync, day: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'analytics_salt'").get() as { value: string } | undefined;
  try {
    const s = row ? (JSON.parse(row.value) as { day: string; salt: string }) : null;
    if (s?.day === day) return s.salt;
  } catch {}
  const salt = randomBytes(16).toString("hex");
  db.prepare("INSERT INTO settings (key, value) VALUES ('analytics_salt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(JSON.stringify({ day, salt }));
  // วันใหม่: ล้างข้อมูลเก่าเกินกำหนด
  db.prepare("DELETE FROM analytics_events WHERE day < ?").run(bangkokDay(new Date(Date.now() - KEEP_DAYS * 86400_000)));
  return salt;
}

export function visitorId(db: DatabaseSync, day: string, ip: string, ua: string): string {
  return createHash("sha256").update(`${dailySalt(db, day)}|${ip}|${ua}`).digest("hex").slice(0, 20);
}

export type TrackInput = { type: string; path?: unknown; place?: unknown };

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);

/** บันทึก 1 event · คืน false ถ้าข้าม (bot / ข้อมูลผิด / ส่งถี่เกิน) */
export function recordEvent(db: DatabaseSync, input: TrackInput, ip: string, ua: string, now = new Date()): boolean {
  if (isBot(ua) || !EVENT_TYPES.includes(input.type as EventType)) return false;
  const path = clip(input.path, 300);
  if (!path?.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return false;
  const day = bangkokDay(now);
  const visitor = visitorId(db, day, ip, ua);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM analytics_events WHERE day = ? AND visitor = ?").get(day, visitor) as { n: number };
  if (n >= MAX_EVENTS_PER_VISITOR_DAY) return false;
  const slug = /^\/products\/([a-z0-9-]{1,80})$/.exec(path.split("?")[0])?.[1] ?? null;
  const place = input.type === "pageview" ? null : clip(input.place, 40)?.replace(/[^\w-]/g, "") || null;
  db.prepare("INSERT INTO analytics_events (day, type, visitor, path, slug, place) VALUES (?, ?, ?, ?, ?, ?)")
    .run(day, input.type, visitor, path, slug, place);
  return true;
}

export type DayRow = {
  day: string;
  visitors: number;
  pageviews: number;
  productViews: number;
  lineClicks: number;
  lineVisitors: number;
};

export function dailyReport(db: DatabaseSync, from: string, to: string): DayRow[] {
  return db.prepare(`SELECT day,
      COUNT(DISTINCT visitor) AS visitors,
      SUM(type = 'pageview') AS pageviews,
      SUM(type = 'pageview' AND slug IS NOT NULL) AS productViews,
      SUM(type IN ('line_click', 'line_order')) AS lineClicks,
      COUNT(DISTINCT CASE WHEN type IN ('line_click', 'line_order') THEN visitor END) AS lineVisitors
    FROM analytics_events WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day DESC`).all(from, to) as DayRow[];
}

export type ProductRow = { slug: string; name: string | null; views: number; viewers: number; lineOrders: number };

export function topProducts(db: DatabaseSync, from: string, to: string, limit = 50): ProductRow[] {
  return db.prepare(`SELECT e.slug,
      (SELECT name FROM products p WHERE p.slug = e.slug) AS name,
      SUM(e.type = 'pageview') AS views,
      COUNT(DISTINCT CASE WHEN e.type = 'pageview' THEN e.visitor END) AS viewers,
      SUM(e.type = 'line_order') AS lineOrders
    FROM analytics_events e WHERE e.slug IS NOT NULL AND e.day BETWEEN ? AND ?
    GROUP BY e.slug ORDER BY views DESC, lineOrders DESC LIMIT ?`).all(from, to, limit) as ProductRow[];
}

export function lineClicksByPlace(db: DatabaseSync, from: string, to: string): { place: string; clicks: number; visitors: number }[] {
  return db.prepare(`SELECT COALESCE(place, 'other') AS place, COUNT(*) AS clicks, COUNT(DISTINCT visitor) AS visitors
    FROM analytics_events WHERE type IN ('line_click', 'line_order') AND day BETWEEN ? AND ?
    GROUP BY 1 ORDER BY clicks DESC`).all(from, to) as { place: string; clicks: number; visitors: number }[];
}

/** ยอดรวมทั้งช่วง (ผู้เข้าชมนับแยกวัน — คนเดียวกันมา 2 วันนับ 2) */
export function totals(rows: DayRow[]) {
  return rows.reduce(
    (t, r) => ({
      visitors: t.visitors + r.visitors,
      pageviews: t.pageviews + r.pageviews,
      productViews: t.productViews + r.productViews,
      lineClicks: t.lineClicks + r.lineClicks,
      lineVisitors: t.lineVisitors + r.lineVisitors,
    }),
    { visitors: 0, pageviews: 0, productViews: 0, lineClicks: 0, lineVisitors: 0 },
  );
}
