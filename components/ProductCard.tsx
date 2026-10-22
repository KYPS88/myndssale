import Link from "next/link";
import type { ProductCard as Card } from "@/lib/products";
import { swatchBackground } from "@/lib/colors";
import { WishlistButton } from "./Wishlist";
import { Img } from "@/components/Img";
import { SOLD_OUT_IMG, SoldOutOverlay } from "./SoldOut";

export function Price({ price, maxPrice, compareAt, className = "" }: { price: number; maxPrice?: number; compareAt?: number | null; className?: string }) {
  return (
    <span className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={compareAt ? "font-semibold text-sale" : "font-semibold"}>
        ฿{price.toLocaleString("th-TH")}
        {maxPrice && maxPrice > price ? ` – ฿${maxPrice.toLocaleString("th-TH")}` : ""}
      </span>
      {compareAt ? <s className="text-sm text-muted">฿{compareAt.toLocaleString("th-TH")}</s> : null}
    </span>
  );
}

export function ProductCard({ p, priority }: { p: Card; priority?: boolean }) {
  return (
    <Link href={`/products/${p.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-soft">
        <Img
          src={p.image}
          alt={p.name}
          loading={priority ? "eager" : "lazy"}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${p.inStock ? "" : SOLD_OUT_IMG}`}
        />
        {p.hoverImage && p.inStock && (
          <Img src={p.hoverImage} hideOnError alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {p.discountPct > 0 && <span className="rounded-full bg-sale px-2 py-0.5 text-xs font-semibold text-white">-{p.discountPct}%</span>}
        </div>
        {!p.inStock && <SoldOutOverlay />}
        <WishlistButton slug={p.slug} className="absolute right-2 top-2" />
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-1">
          {p.colors.slice(0, 6).map((c) => (
            <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: swatchBackground(c.name) }} />
          ))}
          {p.colors.length > 6 && <span className="text-xs text-muted">+{p.colors.length - 6}</span>}
        </div>
        <h3 className="line-clamp-2 text-sm leading-snug">{p.name}</h3>
        <Price price={p.price} compareAt={p.compareAt} className="text-sm" />
      </div>
    </Link>
  );
}
