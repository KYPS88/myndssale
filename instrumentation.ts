// รันครั้งเดียวตอนเซิร์ฟเวอร์ Next.js เริ่ม: ตั้งเวลาซิงก์สต็อกจาก JST (ถ้าตั้งค่าคีย์ไว้)
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startStockSyncSchedule } = await import("./lib/stock-sync");
  startStockSyncSchedule();
}
