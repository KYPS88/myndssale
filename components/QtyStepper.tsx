"use client";

export function QtyStepper({ value, max, onChange, small }: { value: number; max: number; onChange: (n: number) => void; small?: boolean }) {
  const s = small ? "h-8 w-8 text-sm" : "h-10 w-10";
  return (
    <div className="inline-flex items-center rounded-full border border-line">
      <button type="button" className={`${s} grid place-items-center disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="ลดจำนวน">−</button>
      <span className={`${small ? "w-6 text-sm" : "w-8"} text-center`} aria-live="polite">{value}</span>
      <button type="button" className={`${s} grid place-items-center disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= Math.min(max, 99)} aria-label="เพิ่มจำนวน">+</button>
    </div>
  );
}
