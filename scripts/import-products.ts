// นำเข้า/อัปเดตสินค้าจาก CSV ของชีต 03_Product_Master
// ใช้: npm run import:products [-- path/to/file.csv] [--keep-stock]
import { readFileSync } from "node:fs";
import { openDb, importProducts, dbPath } from "../lib/db.ts";
import { parseProductMaster } from "../lib/catalog.ts";

const args = process.argv.slice(2);
const keepStock = args.includes("--keep-stock");
const file = args.find((a) => !a.startsWith("--")) ?? "data/product-master.csv";
const products = parseProductMaster(readFileSync(file, "utf8"));
const db = openDb();
const r = importProducts(db, products, { keepStock });
console.log(`DB: ${dbPath()}`);
console.log(`นำเข้า ${r.products} สินค้า (ใหม่ ${r.created}, อัปเดต ${r.updated}) · ${r.variants} variants`);
console.log(`เปิดขาย ${products.filter((p) => p.status === "active").length} · ซ่อน (ไม่มีราคา/ของแถม) ${products.filter((p) => p.status === "hidden").length}`);
