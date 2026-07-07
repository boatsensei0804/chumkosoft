"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/features/i18n/actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";

/** Compact segmented control to switch the UI language (persists via cookie). */
export default function LanguageSwitcher({ current }: { current: Locale }): React.ReactNode {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale): void {
    if (locale === current || pending) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex gap-0.5 rounded-[9px] p-0.5" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }} role="group" aria-label="เลือกภาษา / Language">
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            aria-pressed={active}
            disabled={pending}
            onClick={() => choose(locale)}
            className="rounded-[7px] px-2.5 py-1 text-[12.5px] font-semibold transition-colors"
            style={{ backgroundColor: active ? "var(--bg)" : "transparent", color: active ? "var(--brand-ink)" : "var(--muted)", boxShadow: active ? "var(--shadow-sm)" : "none" }}
          >
            {LOCALE_LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}
