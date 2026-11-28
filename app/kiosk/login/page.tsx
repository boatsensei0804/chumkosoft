import BrandMark from "@/features/dashboard/components/brand-mark";
import LoginForm from "@/features/auth/components/login-form";
import { getDictionary } from "@/lib/i18n/server";

export default async function DisplayLogin() {
  const t = (await getDictionary()).login;
  return <main className="grid min-h-dvh place-items-center bg-surface p-5">
    <section className="w-full max-w-md rounded-2xl border border-line bg-card p-7">
      <BrandMark /><h1 className="mt-7 text-2xl font-bold">เข้าสู่จอ Kiosk</h1>
      <p className="mb-6 mt-2 text-muted">ใช้บัญชีจุดสแกนของโรงเรียนเพื่อเปิดจอแสดงผลเข้า–ออก</p>
      <LoginForm t={t} display />
    </section>
  </main>;
}
