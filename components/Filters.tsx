"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { swatchBackground } from "@/lib/colors";
import { CloseIcon } from "./icons";

type Facet = { value: string; count: number };
type Facets = {
  category: Facet[];
  gender: Facet[];
  collection: Facet[];
  color: Facet[];
  size: Facet[];
  priceMin: number;
  priceMax: number;
};

const SORTS = [
  { key: "recommended", label: "แนะนำ" },
  { key: "popular", label: "ขายดี" },
  { key: "newest", label: "ใหม่ล่าสุด" },
  { key: "price_asc", label: "ราคา ต่ำ → สูง" },
  { key: "price_desc", label: "ราคา สูง → ต่ำ" },
  { key: "discount", label: "ส่วนลดมากสุด" },
];
const GENDER: Record<string, string> = { UNISEX: "Unisex", WOMEN: "ผู้หญิง", KIDS: "เด็ก" };

export function Filters({ facets, total }: { facets: Facets; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  const values = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  const push = (u: URLSearchParams) => {
    u.delete("page");
    router.replace(`${pathname}?${u.toString()}`, { scroll: false });
  };
  const toggle = (k: string, v: string) => {
    const u = new URLSearchParams(sp.toString());
    const cur = values(k);
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (next.length) u.set(k, next.join(","));
    else u.delete(k);
    push(u);
  };
  const setFlag = (k: string, on: boolean) => {
    const u = new URLSearchParams(sp.toString());
    if (on) u.set(k, "1");
    else u.delete(k);
    push(u);
  };
  const setParam = (k: string, v: string) => {
    const u = new URLSearchParams(sp.toString());
    if (v) u.set(k, v);
    else u.delete(k);
    push(u);
  };
  const applyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const u = new URLSearchParams(sp.toString());
    if (min) u.set("min", min);
    else u.delete("min");
    if (max) u.set("max", max);
    else u.delete("max");
    push(u);
  };
  const clearAll = () => {
    const u = new URLSearchParams();
    if (sp.get("q")) u.set("q", sp.get("q")!);
    setMin("");
    setMax("");
    push(u);
  };
  const activeCount = ["category", "gender", "collection", "color", "size"].reduce((n, k) => n + values(k).length, 0) +
    (sp.get("instock") ? 1 : 0) + (sp.get("sale") ? 1 : 0) + (sp.get("min") || sp.get("max") ? 1 : 0);

  const Check = ({ k, f, label }: { k: string; f: Facet; label?: string }) => (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
      <input type="checkbox" className="h-4 w-4 accent-ink" checked={values(k).includes(f.value)} onChange={() => toggle(k, f.value)} />
      <span className="flex-1">{label ?? f.value}</span>
      <span className="text-xs text-muted">{f.count}</span>
    </label>
  );

  const body = (
    <div className="space-y-6">
      <Group title="หมวดหมู่">{facets.category.map((f) => <Check key={f.value} k="category" f={f} />)}</Group>
      <Group title="กลุ่ม">{facets.gender.map((f) => <Check key={f.value} k="gender" f={f} label={GENDER[f.value] ?? f.value} />)}</Group>
      {facets.collection.length > 0 && (
        <Group title="คอลเลกชัน">{facets.collection.map((f) => <Check key={f.value} k="collection" f={f} />)}</Group>
      )}
      <Group title="ไซซ์">
        <div className="flex flex-wrap gap-2">
          {facets.size.map((f) => {
            const on = values("size").includes(f.value);
            return (
              <button key={f.value} type="button" onClick={() => toggle("size", f.value)} aria-pressed={on}
                className={`min-w-11 rounded-lg border px-2 py-1.5 text-sm ${on ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
                {f.value}
              </button>
            );
          })}
        </div>
      </Group>
      <Group title="สี">
        <div className="flex flex-wrap gap-2">
          {facets.color.map((f) => {
            const on = values("color").includes(f.value);
            return (
              <button key={f.value} type="button" onClick={() => toggle("color", f.value)} aria-pressed={on} title={f.value}
                className={`h-8 w-8 rounded-full border ${on ? "ring-2 ring-ink ring-offset-2" : "border-black/10"}`}
                style={{ background: swatchBackground(f.value) }}>
                <span className="sr-only">{f.value}</span>
              </button>
            );
          })}
        </div>
      </Group>
      <Group title="ราคา (บาท)">
        <form onSubmit={applyPrice} className="flex items-center gap-2">
          <input className="input py-2" inputMode="numeric" placeholder={String(facets.priceMin)} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} aria-label="ราคาต่ำสุด" />
          <span>–</span>
          <input className="input py-2" inputMode="numeric" placeholder={String(facets.priceMax)} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} aria-label="ราคาสูงสุด" />
          <button className="btn-outline px-3 py-2">ตกลง</button>
        </form>
      </Group>
      <Group title="อื่น ๆ">
        <label className="flex items-center gap-2 py-1 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-ink" checked={sp.get("instock") === "1"} onChange={(e) => setFlag("instock", e.target.checked)} />
          เฉพาะสินค้าที่มีสต็อก
        </label>
        <label className="flex items-center gap-2 py-1 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-ink" checked={sp.get("sale") === "1"} onChange={(e) => setFlag("sale", e.target.checked)} />
          สินค้าลดราคา
        </label>
      </Group>
      {activeCount > 0 && <button onClick={clearAll} className="text-sm text-ice underline">ล้างตัวกรองทั้งหมด</button>}
    </div>
  );

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 lg:col-span-2">
        <button className="btn-outline lg:hidden" onClick={() => setOpen(true)}>
          ตัวกรอง{activeCount ? ` (${activeCount})` : ""}
        </button>
        <span className="hidden text-sm text-muted lg:block">{total} สินค้า</span>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="hidden sm:inline">เรียงตาม</span>
          <select className="input w-auto py-2" value={sp.get("sort") ?? "recommended"} onChange={(e) => setParam("sort", e.target.value === "recommended" ? "" : e.target.value)}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <aside className="hidden lg:block">{body}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[90%] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-line p-4">
              <span className="font-semibold">ตัวกรอง</span>
              <button onClick={() => setOpen(false)} aria-label="ปิด"><CloseIcon /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{body}</div>
            <div className="border-t border-line p-4">
              <button className="btn-primary w-full" onClick={() => setOpen(false)}>ดู {total} สินค้า</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
