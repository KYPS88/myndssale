import { login } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = !!process.env.ADMIN_PASSWORD;
  return (
    <div className="container-x max-w-sm py-20">
      <form action={login} className="card space-y-4 p-6">
        <h1 className="text-xl font-semibold">เข้าสู่ระบบหลังบ้าน</h1>
        {!configured && <p className="rounded-lg bg-sale/10 p-3 text-sm text-sale">ยังไม่ได้ตั้งค่า ADMIN_PASSWORD ในไฟล์ .env</p>}
        <div><label className="label" htmlFor="password">รหัสผ่าน</label><input id="password" name="password" type="password" className="input" autoComplete="current-password" required /></div>
        {error && <p className="text-sm text-sale">{error === "locked" ? "ลองผิดหลายครั้ง กรุณารอ 5 นาที" : "รหัสผ่านไม่ถูกต้อง"}</p>}
        <button className="btn-primary w-full">เข้าสู่ระบบ</button>
      </form>
    </div>
  );
}
