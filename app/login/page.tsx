import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BrandMark from "@/features/dashboard/components/brand-mark";
import LoginForm from "@/features/auth/components/login-form";
import LanguageSwitcher from "@/features/i18n/components/language-switcher";
import { decryptSession, getSessionToken } from "@/lib/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";

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
      className="grid min-h-dvh place-items-center px-4 py-10"
      style={{
        background: "linear-gradient(180deg, var(--surface) 0%, oklch(0.945 0.024 254) 100%)",
      }}
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-between">
          <BrandMark />
          <LanguageSwitcher current={locale} />
        </div>

        <section
          className="overflow-hidden rounded-[16px]"
          style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "0 8px 30px oklch(0.45 0.15 254 / 0.08)" }}
          aria-labelledby="login-heading"
        >
          {/* Letterhead band — the institutional signature */}
          <div
            className="h-1.5 w-full"
            style={{ backgroundImage: "linear-gradient(90deg, var(--brand) 0%, var(--brand-strong) 100%)" }}
            aria-hidden="true"
          />

          <div className="px-7 pb-7 pt-6">
            <h1 id="login-heading" className="text-[20px] font-bold text-ink-strong">
              {t.title}
            </h1>
            <p className="mb-6 mt-1 text-[14px] text-muted">{t.subtitle}</p>

            <LoginForm t={t} />
          </div>
        </section>

        <p className="mt-6 text-center text-[12px] text-faint">{t.footer}</p>
      </div>
    </main>
  );
}
