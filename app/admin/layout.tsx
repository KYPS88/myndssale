import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "หลังบ้าน", template: "%s | หลังบ้าน Mynds" }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[70vh] bg-soft">{children}</div>;
}
