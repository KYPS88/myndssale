import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <p className="text-6xl font-bold text-line">404</p>
      <h1 className="mt-4 text-2xl font-semibold">ไม่พบหน้าที่คุณต้องการ</h1>
      <Link href="/products" className="btn-primary mt-6">ไปที่หน้าสินค้า</Link>
    </div>
  );
}
