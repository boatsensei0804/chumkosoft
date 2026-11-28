"use client";

import { useState } from "react";
import LoginForm from "@/features/auth/components/login-form";
import QrLogin, { useQrChallenge } from "@/features/auth/components/qr-login";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export default function LoginChoices({ t }: { t: Dictionary["login"] }): React.ReactNode {
  const [mode, setMode] = useState<"password" | "qr">("password");
  const qr = useQrChallenge();

  function selectQr(): void {
    if (mode === "qr") return;
    setMode("qr");
    void qr.createChallenge();
  }

  return <>
    <div role="group" aria-label={t.title} className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface-2 p-1">
      <button type="button" aria-pressed={mode === "password"} onClick={() => setMode("password")}
        className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${mode === "password" ? "bg-card text-brand-ink shadow-sm" : "text-muted hover:bg-brand-soft"}`}>
        {t.passwordTab}
      </button>
      <button type="button" aria-pressed={mode === "qr"} onClick={selectQr}
        className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${mode === "qr" ? "bg-card text-brand-ink shadow-sm" : "text-muted hover:bg-brand-soft"}`}>
        {t.qrTab}
      </button>
    </div>
    {mode === "password" ? <LoginForm t={t} /> : <QrLogin key={qr.challenge?.code ?? "preparing"} t={t} qr={qr} />}
  </>;
}
