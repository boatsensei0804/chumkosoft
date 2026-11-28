import PageHeader from "@/features/dashboard/components/page-header";
import { DisplayQrLogin } from "@/features/auth/components/qr-login";
import LoginForm from "@/features/auth/components/login-form";
import { getDictionary } from "@/lib/i18n/server";

export default async function DisplayLogin() {
  const t = (await getDictionary()).login;
  return <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-6 sm:px-5">
    <section className="w-full min-w-0 max-w-2xl">
      <PageHeader pose="scan" title="เข้าสู่จอ Kiosk" subtitle="ใช้บัญชีจุดสแกนของโรงเรียนเพื่อเปิดจอแสดงผลเข้า–ออก" />
      <div className="rounded-2xl border border-line bg-card p-4 sm:p-7">
        <DisplayQrLogin t={t} />
        <details className="mt-5 border-t border-line">
          <summary className="min-h-11 cursor-pointer rounded-lg py-3 font-semibold text-brand-ink focus-visible:outline-2 focus-visible:outline-brand">
            เข้าสู่ระบบด้วยรหัสผ่าน
          </summary>
          <div className="mt-2"><LoginForm t={t} display /></div>
        </details>
      </div>
    </section>
  </main>;
}
