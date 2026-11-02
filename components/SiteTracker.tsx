"use client";

// นับสถิติของเราเอง (หน้าหลังบ้าน › สถิติ): เปิดหน้า / ดูสินค้า / กดไป LINE
// ไม่ใช้คุกกี้และไม่เก็บข้อมูลส่วนตัว จึงไม่ต้องรอการยอมรับคุกกี้
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function sendEvent(type: "pageview" | "line_click" | "line_order", place?: string) {
  try {
    const body = JSON.stringify({ type, path: location.pathname, place });
    if (!navigator.sendBeacon?.("/api/track", body)) {
      void fetch("/api/track", { method: "POST", body, keepalive: true });
    }
  } catch {}
}

const isLineLink = (href: string) => /^https:\/\/(lin\.ee|line\.me)\//.test(href);

export function SiteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/admin")) sendEvent("pageview");
  }, [pathname]);

  // ลิงก์ LINE ทุกจุดในเว็บ — ใส่ data-line="ชื่อจุด" ที่ลิงก์เพื่อแยกว่ากดจากตรงไหน
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || !isLineLink(a.href) || a.dataset.line === "order") return;
      sendEvent("line_click", a.dataset.line || "other");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
