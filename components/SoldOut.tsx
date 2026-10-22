/** ป้ายทับรูปเมื่อสินค้าหมดสต็อก (ใช้คู่กับรูปที่ทำให้จางด้วย SOLD_OUT_IMG) */
export const SOLD_OUT_IMG = "opacity-40 grayscale";

export function SoldOutOverlay({ large = false }: { large?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-3">
      <div className={`rounded-xl bg-white/90 text-center shadow-sm ${large ? "px-6 py-4" : "px-3 py-2"}`}>
        <p className={`font-semibold text-ink ${large ? "text-lg" : "text-sm"}`}>สินค้าหมดสต็อก</p>
        <p className={`text-muted ${large ? "text-sm" : "text-xs"}`}>รอสินค้าเข้าเร็ว ๆ นี้</p>
      </div>
    </div>
  );
}
