"use client";

import { useEffect, useState } from "react";
import { HeartIcon } from "./icons";

const KEY = "mynds_wishlist_v1";
const EVT = "mynds-wishlist";

export function readWishlist(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function useWishlist() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setList(readWishlist());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = (slug: string) => {
    const cur = readWishlist();
    write(cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]);
  };
  return { list, toggle, has: (slug: string) => list.includes(slug) };
}

export function WishlistButton({ slug, className = "" }: { slug: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const on = has(slug);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggle(slug);
      }}
      className={`grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm ${on ? "text-sale" : "text-ink"} ${className}`}
      aria-pressed={on}
      aria-label={on ? "เอาออกจากรายการที่ชอบ" : "เพิ่มในรายการที่ชอบ"}
    >
      <HeartIcon className="h-4 w-4" filled={on} />
    </button>
  );
}
