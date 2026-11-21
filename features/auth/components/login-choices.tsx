"use client";

import { useState } from "react";
import LoginForm from "@/features/auth/components/login-form";
import QrLogin from "@/features/auth/components/qr-login";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export default function LoginChoices({ t }: { t: Dictionary["login"] }): React.ReactNode {
  const [mode, setMode] = useState<"password" | "qr">("password");
  return <>
    <div role="group" aria-label={t.title} className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-sky-50 p-1">
      <button type="button" aria-pressed={mode === "password"} onClick={() => setMode("password")}
        className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${mode === "password" ? "bg-white text-brand-ink shadow-sm" : "text-muted"}`}>
        {t.passwordTab}
      </button>
      <button type="button" aria-pressed={mode === "qr"} onClick={() => setMode("qr")}
        className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${mode === "qr" ? "bg-white text-brand-ink shadow-sm" : "text-muted"}`}>
        {t.qrTab}
      </button>
    </div>
    {mode === "password" ? <LoginForm t={t} /> : <QrLogin t={t} />}
  </>;
}
