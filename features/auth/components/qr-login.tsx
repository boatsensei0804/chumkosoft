"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Challenge = { code: string; qrDataUrl: string; lineUrl: string; expiresAt: number };

export default function QrLogin({ t }: { t: Dictionary["login"] }): React.ReactNode {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  async function createChallenge(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setApproved(false);
    setError("");
    setChallenge(null);
    try {
      const response = await fetch("/api/auth/qr/start", { method: "POST", credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "สร้าง QR ไม่สำเร็จ");
      setChallenge({ code: data.code, qrDataUrl: data.qrDataUrl, lineUrl: data.lineUrl,
        expiresAt: Date.now() + data.expiresIn * 1000 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้าง QR ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!challenge) return;
    let stopped = false;
    let polling = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((challenge.expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        stopped = true;
        setChallenge(null);
        setError("QR หมดอายุแล้ว กรุณาสร้างใหม่");
      }
    };
    const poll = async () => {
      if (stopped || polling) return;
      polling = true;
      try {
        const response = await fetch("/api/auth/qr/claim", { method: "POST", credentials: "same-origin", cache: "no-store" });
        const data = await response.json();
        if (stopped) return;
        if (response.ok && data.state === "approved" && data.redirectTo) {
          stopped = true;
          setApproved(true);
          window.location.assign(data.redirectTo);
        } else if (response.ok && data.state === "pending") {
          setError("");
        } else if (response.status === 410) {
          stopped = true;
          setChallenge(null);
          setError(data.message || "QR หมดอายุแล้ว กรุณาสร้างใหม่");
        } else if (!response.ok) {
          setError(data.message || "ตรวจสถานะ QR ไม่สำเร็จ");
        }
      } catch {
        if (!stopped) setError("เชื่อมต่อเว็บไม่ได้ กำลังลองใหม่…");
      } finally {
        polling = false;
      }
    };
    tick();
    const clock = window.setInterval(tick, 1000);
    const checker = window.setInterval(() => { void poll(); }, 3000);
    return () => { stopped = true; window.clearInterval(clock); window.clearInterval(checker); };
  }, [challenge]);

  return <div className="space-y-3">
    <p className="text-sm leading-6 text-muted">{t.qrIntro}</p>
    {error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
    {challenge ? <>
      <div className="flex flex-col items-center rounded-2xl border border-blue-100 bg-white p-3 text-center">
        <Image unoptimized src={challenge.qrDataUrl} width={240} height={240} alt={t.qrTab} className="size-[clamp(156px,22dvh,210px)]" />
        <p className="mt-2 break-all font-mono text-base font-bold tracking-wide text-ink-strong">LOGIN {challenge.code}</p>
        <p className="mt-1 text-xs text-muted">{t.qrCode}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-x-2 text-center text-sm font-semibold text-brand-ink">
        <p role="status">{approved ? t.submitting : t.qrWaiting}</p>
        {!approved && <p role="timer">{t.qrExpires} {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline"><a href={challenge.lineUrl} target="_blank" rel="noreferrer">{t.qrOpenLine}</a></Button>
        <Button type="button" variant="outline" onClick={() => void createChallenge()} disabled={busy}>{t.qrRefresh}</Button>
      </div>
    </> : <Button type="button" className="w-full" size="lg" onClick={() => void createChallenge()} disabled={busy}>
      {busy ? t.submitting : t.qrCreate}
    </Button>}
    <p className="text-xs leading-5 text-muted">{t.qrLinkedOnly}</p>
  </div>;
}
