import PageHeader from "@/features/dashboard/components/page-header";
import LoginForm from "@/features/auth/components/login-form";
import { getDictionary } from "@/lib/i18n/server";

export default async function DisplayLogin() {
  const t = (await getDictionary()).login;
  return <main className="grid min-h-dvh place-items-center bg-surface p-5">
    <section className="w-full max-w-2xl">
      <PageHeader pose="scan" title="เข้าสู่จอ Kiosk" subtitle="ใช้บัญชีจุดสแกนของโรงเรียนเพื่อเปิดจอแสดงผลเข้า–ออก" />
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-7"><LoginForm t={t} display /></div>
    </section>
  </main>;
}
