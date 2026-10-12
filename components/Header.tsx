"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon } from "./icons";
import { NAV } from "./nav";
import { track } from "./analytics";
import { Img } from "@/components/Img";

type Suggestion = { slug: string; name: string; price: number; image: string | null; category: string };

function SearchBox({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setItems((await res.json()).items);
      } catch {}
    }, 200);
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    track("search", { search_term: q });
    setOpen(false);
    onDone?.();
    router.push(`/products?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form onSubmit={submit} className="relative w-full" role="search">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        className="input rounded-full bg-soft pl-9"
        placeholder="ค้นหาสินค้า / SKU"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="ค้นหาสินค้า"
      />
      {open && items.length > 0 && (
        <div className="card absolute inset-x-0 top-full z-50 mt-2 overflow-hidden shadow-lg">
          {items.map((s) => (
            <Link
              key={s.slug}
              href={`/products/${s.slug}`}
              className="flex items-center gap-3 px-3 py-2 hover:bg-soft"
              onClick={() => onDone?.()}
            >
              <Img src={s.image} alt="" className="h-10 w-10 rounded object-cover bg-soft" />
              <span className="flex-1 text-sm">
                <span className="line-clamp-1">{s.name}</span>
                <span className="text-xs text-muted">{s.category}</span>
              </span>
              <span className="text-sm font-medium">฿{s.price.toLocaleString("th-TH")}</span>
            </Link>
          ))}
          <button type="submit" className="block w-full border-t border-line px-3 py-2 text-left text-sm text-ice hover:bg-soft">
            ดูผลลัพธ์ทั้งหมดของ “{q}”
          </button>
        </div>
      )}
    </form>
  );
}

export function Header({ announcement }: { announcement?: string }) {
  const { count, setDrawerOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      {announcement && (
        <div className="bg-ink px-4 py-1.5 text-center text-xs text-white">{announcement}</div>
      )}
      <div className="container-x flex h-16 items-center gap-4">
        <button className="-ml-1 p-1 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="เปิดเมนู">
          <MenuIcon />
        </button>
        <Link href="/" className="text-2xl font-bold tracking-[0.2em]" aria-label="Mynds หน้าแรก">
          MYNDS
        </Link>
        <nav className="ml-6 hidden gap-5 text-sm lg:flex" aria-label="เมนูหลัก">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={n.accent ? "font-semibold text-sale" : "hover:text-ice"}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden w-64 md:block xl:w-72">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <button className="p-2 md:hidden" onClick={() => setSearchOpen((v) => !v)} aria-label="ค้นหา">
            <SearchIcon />
          </button>
          <Link href="/wishlist" className="p-2" aria-label="สินค้าที่ชอบ">
            <HeartIcon />
          </Link>
          <button className="relative p-2" onClick={() => setDrawerOpen(true)} aria-label={`ตะกร้าสินค้า ${count} ชิ้น`}>
            <BagIcon />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ice px-1 text-[11px] font-semibold text-white">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
      {searchOpen && (
        <div className="container-x pb-3 md:hidden">
          <SearchBox autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85%] overflow-y-auto bg-white p-5">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xl font-bold tracking-[0.2em]">MYNDS</span>
              <button onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"><CloseIcon /></button>
            </div>
            <nav className="flex flex-col divide-y divide-line" aria-label="เมนูมือถือ">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className={`py-3 ${n.accent ? "font-semibold text-sale" : ""}`}>
                  {n.label}
                </Link>
              ))}
              <Link href="/track" onClick={() => setMenuOpen(false)} className="py-3">ติดตามคำสั่งซื้อ</Link>
              <Link href="/faq" onClick={() => setMenuOpen(false)} className="py-3">คำถามที่พบบ่อย / ติดต่อเรา</Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
