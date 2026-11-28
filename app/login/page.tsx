import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { redirect } from "next/navigation";
import BrandMark from "@/features/dashboard/components/brand-mark";
import LoginChoices from "@/features/auth/components/login-choices";
import LanguageSwitcher from "@/features/i18n/components/language-switcher";
import { decryptSession, getSessionToken } from "@/lib/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import Image from "next/image";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ — chumkosoft",
};

export default async function LoginPage(): Promise<React.ReactNode> {
  const session = await decryptSession(await getSessionToken());
  if (session) {
    redirect("/dashboard");
  }

  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.login;
  const english = locale === "en";

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-8 lg:px-12">
          <Link href="/" aria-label={english ? "Chumkosoft home" : "Chumkosoft หน้าแรก"} className="rounded-lg"><BrandMark /></Link>
          <LanguageSwitcher current={locale} />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-8 sm:px-8 sm:py-12 lg:min-h-[calc(100dvh-11rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:px-12">
        <section aria-labelledby="login-heading" className="mx-auto w-full min-w-0 max-w-lg rounded-[24px] border border-line bg-card p-5 shadow-school-panel sm:p-8 lg:mx-0">
          <h1 id="login-heading" className="text-3xl font-bold leading-tight tracking-tight text-ink-strong sm:text-4xl">{t.title}</h1>
          <p className="mb-5 mt-3 text-pretty text-sm leading-7 text-muted sm:text-base">{t.subtitle}</p>
          <LoginChoices t={t} />

          <details className="group mt-5 border-y border-line text-sm text-muted">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-md py-2 font-semibold text-brand-ink hover:text-brand [&::-webkit-details-marker]:hidden">
              {english ? "Which account should I use?" : "ควรใช้บัญชีแบบไหน?"}
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 motion-safe:transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-2 pb-4 leading-relaxed">
              <p>{english ? "Teachers and staff sign in with their school-issued account. Contact your school administrator if you need help signing in." : "ครูและเจ้าหน้าที่ใช้บัญชีที่โรงเรียนออกให้ หากเข้าสู่ระบบไม่ได้ กรุณาติดต่อผู้ดูแลระบบของโรงเรียน"}</p>
              <p>{english ? "Scanner accounts connect the scanner app using QR and manage device settings." : "บัญชีจุดสแกนใช้เชื่อมแอปสแกนผ่าน QR และตั้งค่าอุปกรณ์"}</p>
            </div>
          </details>
        </section>

        <div aria-hidden="true" className="relative hidden min-h-[540px] overflow-hidden rounded-[28px] bg-school-panel-wash lg:block">
          <Image src="/mascot/login-scene.webp" alt="" fill sizes="(min-width: 1024px) 50vw, 1px" className="object-cover object-center" />
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-6 text-xs leading-6 text-muted sm:px-8 lg:px-12">{t.footer}</footer>
    </div>
  );
}
