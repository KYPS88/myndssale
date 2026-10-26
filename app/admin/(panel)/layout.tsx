import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { logout } from "../actions";

const NAV = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/orders", label: "คำสั่งซื้อ" },
  { href: "/admin/products", label: "สินค้า / สต็อก" },
  { href: "/admin/stock-sync", label: "สต็อก JST" },
  { href: "/admin/coupons", label: "คูปอง" },
  { href: "/admin/articles", label: "บทความ" },
  { href: "/admin/import", label: "นำเข้าสินค้า" },
  { href: "/admin/settings", label: "ตั้งค่าร้าน" },
];

export default async function Panel({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-full bg-white px-4 py-2 text-sm shadow-sm hover:bg-ink hover:text-white">{n.label}</Link>)}
        <form action={logout} className="ml-auto"><button className="text-sm text-muted underline">ออกจากระบบ</button></form>
      </div>
      {children}
    </div>
  );
}
