import PageHeader from "@/features/dashboard/components/page-header";
import { DisplayQrLogin } from "@/features/auth/components/qr-login";
import LoginForm from "@/features/auth/components/login-form";
import { getDictionary } from "@/lib/i18n/server";

export default async function DisplayLogin() {
  const t = (await getDictionary()).login;
  return <main className="grid min-h-dvh place-items-center bg-surface p-5">
    <section className="w-full max-w-2xl">
      <PageHeader pose="scan" title="เข้าสู่จอ Kiosk" subtitle="ใช้บัญชีจุดสแกนของโรงเรียนเพื่อเปิดจอแสดงผลเข้า–ออก" />
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-7"><DisplayQrLogin t={t} /><details className="mt-5 border-t border-line pt-4"><summary className="mb-3 cursor-pointer font-semibold">เข้าสู่ระบบด้วยรหัสผ่าน</summary><LoginForm t={t} display /></details></div>
    </section>
  </main>;
}
