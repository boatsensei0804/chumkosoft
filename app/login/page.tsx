import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BrandMark from "@/features/dashboard/components/brand-mark";
import LoginChoices from "@/features/auth/components/login-choices";
import LanguageSwitcher from "@/features/i18n/components/language-switcher";
import { decryptSession, getSessionToken } from "@/lib/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import Mascot from "@/components/ui/mascot";
import Image from "next/image";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ — chumkosoft",
};

export default async function LoginPage(): Promise<React.ReactNode> {
  // Already signed in → skip the form.
  const session = await decryptSession(await getSessionToken());
  if (session) {
    redirect("/dashboard");
  }

  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.login;

  return (
    <main
      className="grid min-h-dvh place-items-center bg-linear-to-b from-surface to-school-panel-wash px-4 py-5 md:py-3"
    >
      <div className="w-full max-w-[1040px]">
        <div className="mb-3 flex items-center justify-between">
          <BrandMark />
          <LanguageSwitcher current={locale} />
        </div>

        <section
          className="overflow-hidden rounded-[28px] border border-school-panel-border bg-school-panel shadow-school-panel"
          aria-labelledby="login-heading"
        >
          {/* Letterhead band — the institutional signature */}
          <div
            className="h-1.5 w-full"
            style={{ backgroundImage: "linear-gradient(90deg, var(--brand) 0%, var(--brand-strong) 100%)" }}
            aria-hidden="true"
          />

          <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div className="relative hidden min-h-[540px] flex-col justify-end overflow-hidden border-r border-blue-100 bg-[#eaf5ff] p-8 md:flex">
              <Image src="/mascot/login-scene.webp" alt="" fill priority sizes="520px" className="object-cover object-center" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#d9edff] to-transparent" />
              <div className="relative rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur-sm"><p className="text-lg font-bold text-[#0b4385]">ยินดีต้อนรับสู่ Chumkosoft School</p><p className="mt-1 text-sm leading-relaxed text-[#365b80]">ข้อมูลโรงเรียน ครู นักเรียน และครอบครัว เชื่อมถึงกันในที่เดียว</p></div>
            </div>
            <div className="px-6 pb-6 pt-5 sm:px-9 md:py-5">
              <Mascot pose="welcome" size={88} decorative priority className="mx-auto mb-4 md:hidden" />
              <h1 id="login-heading" className="text-[20px] font-bold text-ink-strong">
                {t.title}
              </h1>
              <p className="mb-3 mt-1 text-[14px] text-muted">{t.subtitle}</p>

              <LoginChoices t={t} />
              <details className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-muted"><summary className="min-h-8 cursor-pointer font-semibold text-brand-ink">ต้องใช้บัญชีแบบไหน?</summary><div className="mt-2 space-y-2 leading-6"><p>ครูและเจ้าหน้าที่ใช้บัญชีที่โรงเรียนออกให้ หากเข้าสู่ระบบไม่ได้ กรุณาติดต่อผู้ดูแลระบบ</p><p>บัญชีจุดสแกนใช้สำหรับเชื่อมแอปสแกนผ่าน QR และตั้งค่าอุปกรณ์</p></div></details>
            </div>
          </div>
        </section>

        <p className="mt-3 text-center text-[12px] text-faint">{t.footer}</p>
      </div>
    </main>
  );
}
