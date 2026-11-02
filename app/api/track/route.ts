import { getDb } from "@/lib/db";
import { recordEvent } from "@/lib/analytics";

// รับ event จาก components/SiteTracker.tsx (navigator.sendBeacon ส่งเป็น text/plain)
export async function POST(req: Request) {
  const raw = (await req.text().catch(() => "")).slice(0, 2000);
  let body: { type?: unknown; path?: unknown; place?: unknown } = {};
  try {
    body = JSON.parse(raw);
  } catch {}
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") ?? "";
  try {
    recordEvent(getDb(), { type: String(body.type ?? ""), path: body.path, place: body.place }, ip, ua);
  } catch (e) {
    console.error("track", e);
  }
  return new Response(null, { status: 204 });
}
