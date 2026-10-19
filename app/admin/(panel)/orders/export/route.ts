import { isAdmin } from "@/lib/auth";
import { ordersForExport } from "@/lib/orders";
import { ordersToCsv, bangkokTime } from "@/lib/order-export";

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const csv = ordersToCsv(
    ordersForExport({
      q: sp.get("q") || undefined,
      status: sp.get("status") || undefined,
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
    }),
  );
  const stamp = bangkokTime(new Date().toISOString().slice(0, 19).replace("T", " ")).replace(/[-: ]/g, "").slice(0, 12);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mynds-orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
