import { getDb } from "./db.ts";
import { sizeRank } from "./catalog.ts";

export type Variant = {
  id: number;
  sku: string;
  color: string;
  size: string;
  price: number;
  compare_at: number | null;
  stock: number;
  image: string | null;
};

export type Product = {
  id: number;
  sku: string;
  slug: string;
  name: string;
  name_en: string | null;
  category: string;
  gender: string;
  collection: string | null;
  short_description: string | null;
  description: string | null;
  material: string | null;
  care: string | null;
  fit: string | null;
  features: string | null;
  seo_title: string | null;
  seo_description: string | null;
  size_chart_url: string | null;
  video_url: string | null;
  images: string[];
  status: string;
  featured: number;
  sold_count: number;
  created_at: string;
  variants: Variant[];
};

export type ProductCard = {
  id: number;
  slug: string;
  sku: string;
  name: string;
  category: string;
  gender: string;
  collection: string | null;
  price: number;
  maxPrice: number;
  compareAt: number | null;
  discountPct: number;
  image: string | null;
  hoverImage: string | null;
  colors: { name: string; image: string | null }[];
  sizes: string[];
  inStock: boolean;
  featured: number;
  sold: number;
  createdAt: string;
};

type Row = Omit<Product, "images" | "variants"> & { images: string };

function hydrate(rows: Row[], variants: (Variant & { product_id: number })[]): Product[] {
  const byProduct = new Map<number, Variant[]>();
  for (const v of variants) {
    const list = byProduct.get(v.product_id) ?? [];
    list.push(v);
    byProduct.set(v.product_id, list);
  }
  return rows.map((r) => ({
    ...r,
    images: JSON.parse(r.images || "[]"),
    variants: (byProduct.get(r.id) ?? []).sort(
      (a, b) => a.color.localeCompare(b.color) || sizeRank(a.size) - sizeRank(b.size),
    ),
  }));
}

export function getAllProducts(opts: { includeHidden?: boolean } = {}): Product[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM products ${opts.includeHidden ? "" : "WHERE status = 'active'"} ORDER BY featured DESC, id`)
    .all() as Row[];
  const variants = db.prepare("SELECT * FROM variants").all() as (Variant & { product_id: number })[];
  return hydrate(rows, variants);
}

export function getProductBySlug(slug: string, opts: { includeHidden?: boolean } = {}): Product | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM products WHERE slug = ?").get(slug) as Row | undefined;
  if (!row || (!opts.includeHidden && row.status !== "active")) return null;
  const variants = db.prepare("SELECT * FROM variants WHERE product_id = ?").all(row.id) as (Variant & {
    product_id: number;
  })[];
  return hydrate([row], variants)[0];
}

/** Variants shown to shoppers: only those with a price. */
export function sellable(p: Product): Variant[] {
  return p.variants.filter((v) => v.price > 0);
}

export function toCard(p: Product): ProductCard {
  const vs = sellable(p);
  const inStockVs = vs.filter((v) => v.stock > 0);
  const pool = inStockVs.length ? inStockVs : vs;
  const price = Math.min(...pool.map((v) => v.price));
  const maxPrice = Math.max(...pool.map((v) => v.price));
  const cheapest = pool.find((v) => v.price === price);
  const compareAt = cheapest?.compare_at ?? null;
  const colors: ProductCard["colors"] = [];
  for (const v of vs) {
    if (!colors.some((c) => c.name === v.color)) colors.push({ name: v.color, image: v.image });
  }
  const firstImage = (inStockVs.find((v) => v.image) ?? vs.find((v) => v.image))?.image ?? p.images[0] ?? null;
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    category: p.category,
    gender: p.gender,
    collection: p.collection,
    price,
    maxPrice,
    compareAt,
    discountPct: compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0,
    image: firstImage,
    hoverImage: p.images.find((u) => u !== firstImage) ?? null,
    colors,
    sizes: [...new Set(vs.map((v) => v.size))].sort((a, b) => sizeRank(a) - sizeRank(b)),
    inStock: inStockVs.length > 0,
    featured: p.featured,
    sold: p.sold_count,
    createdAt: p.created_at,
  };
}

export type SortKey = "recommended" | "newest" | "price_asc" | "price_desc" | "popular" | "discount";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "แนะนำ" },
  { key: "popular", label: "ขายดี" },
  { key: "newest", label: "ใหม่ล่าสุด" },
  { key: "price_asc", label: "ราคา ต่ำ → สูง" },
  { key: "price_desc", label: "ราคา สูง → ต่ำ" },
  { key: "discount", label: "ส่วนลดมากสุด" },
];

export type ListQuery = {
  q?: string;
  /** หัวข้อหน้า (ใช้กับลิงก์เมนูที่กรองหลายค่า) */
  title?: string;
  category?: string[];
  gender?: string[];
  collection?: string[];
  color?: string[];
  size?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sale?: boolean;
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[\s\-_/]+/g, " ").trim();
}

export function matchesQuery(p: Product, q: string): boolean {
  const terms = normalizeText(q).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const hay = normalizeText(
    [p.name, p.name_en, p.sku, p.category, p.collection, p.gender, ...p.variants.map((v) => `${v.sku} ${v.color}`)]
      .filter(Boolean)
      .join(" "),
  );
  return terms.every((t) => hay.includes(t));
}

export function listProducts(query: ListQuery) {
  const all = getAllProducts().filter((p) => sellable(p).length > 0);
  const facetsBase = all;
  const has = (list: string[] | undefined) => list && list.length > 0;

  const items = all.filter((p) => {
    if (query.q && !matchesQuery(p, query.q)) return false;
    if (has(query.category) && !query.category!.includes(p.category)) return false;
    if (has(query.gender) && !query.gender!.includes(p.gender)) return false;
    if (has(query.collection) && !query.collection!.includes(p.collection ?? "")) return false;
    const vs = sellable(p).filter(
      (v) =>
        (!has(query.color) || query.color!.includes(v.color)) &&
        (!has(query.size) || query.size!.includes(v.size)) &&
        (!query.inStock || v.stock > 0) &&
        (query.minPrice == null || v.price >= query.minPrice) &&
        (query.maxPrice == null || v.price <= query.maxPrice) &&
        (!query.sale || (v.compare_at ?? 0) > v.price),
    );
    return vs.length > 0;
  });

  const cards = items.map(toCard);
  const sort = query.sort ?? "recommended";
  const cmp: Record<SortKey, (a: ProductCard, b: ProductCard) => number> = {
    recommended: (a, b) => b.featured - a.featured || Number(b.inStock) - Number(a.inStock) || b.sold - a.sold || a.id - b.id,
    popular: (a, b) => b.sold - a.sold || b.featured - a.featured || a.id - b.id,
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id,
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    discount: (a, b) => b.discountPct - a.discountPct,
  };
  cards.sort(cmp[sort]);

  const perPage = query.perPage ?? 24;
  const total = cards.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, query.page ?? 1), pages);
  return {
    total,
    page,
    pages,
    items: cards.slice((page - 1) * perPage, page * perPage),
    facets: buildFacets(facetsBase),
  };
}

export function buildFacets(products: Product[]) {
  const count = (vals: string[]) => {
    const m = new Map<string, number>();
    for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].map(([value, n]) => ({ value, count: n }));
  };
  const vs = products.flatMap((p) => sellable(p));
  const prices = vs.map((v) => v.price);
  return {
    category: count(products.map((p) => p.category)).sort((a, b) => b.count - a.count),
    gender: count(products.map((p) => p.gender)),
    collection: count(products.map((p) => p.collection).filter(Boolean) as string[]),
    color: count(products.flatMap((p) => [...new Set(sellable(p).map((v) => v.color))])).sort(
      (a, b) => b.count - a.count || a.value.localeCompare(b.value),
    ),
    size: count(products.flatMap((p) => [...new Set(sellable(p).map((v) => v.size))])).sort(
      (a, b) => sizeRank(a.value) - sizeRank(b.value),
    ),
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
  };
}

export function searchSuggest(q: string, limit = 6): ProductCard[] {
  if (!q.trim()) return [];
  return getAllProducts()
    .filter((p) => sellable(p).length > 0 && matchesQuery(p, q))
    .slice(0, limit)
    .map(toCard);
}

export function relatedProducts(p: Product, limit = 4): ProductCard[] {
  return getAllProducts()
    .filter((o) => o.id !== p.id && sellable(o).length > 0)
    .map((o) => ({
      o,
      score: (o.category === p.category ? 2 : 0) + (o.collection && o.collection === p.collection ? 2 : 0) + (o.gender === p.gender ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.o.sold_count - a.o.sold_count)
    .slice(0, limit)
    .map(({ o }) => toCard(o));
}

export const GENDER_LABEL: Record<string, string> = { UNISEX: "Unisex", WOMEN: "ผู้หญิง", KIDS: "เด็ก" };
