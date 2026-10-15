import type { ListQuery, SortKey } from "./products.ts";
import { SORTS } from "./products.ts";

export type SP = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);

export function parseListQuery(sp: SP): ListQuery {
  const num = (v: unknown) => {
    const n = Number(Array.isArray(v) ? v[0] : v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) as SortKey | undefined;
  return {
    q: (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.slice(0, 100),
    category: list(sp.category),
    gender: list(sp.gender),
    collection: list(sp.collection),
    color: list(sp.color),
    size: list(sp.size),
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    inStock: sp.instock === "1",
    sale: sp.sale === "1",
    sort: SORTS.some((s) => s.key === sort) ? sort : "recommended",
    page: num(sp.page) ?? 1,
  };
}
