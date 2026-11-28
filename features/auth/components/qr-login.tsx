"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Challenge = { code: string; qrDataUrl: string; lineUrl: string; expiresAt: number };

export function useQrChallenge(display = false) {
  const base = display ? "/api/kiosk/qr" : "/api/auth/qr";
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requesting = useRef(false);

  async function createChallenge(force = false): Promise<void> {
    if (requesting.current || (!force && challenge && challenge.expiresAt > Date.now())) return;
    requesting.current = true;
    setBusy(true);
    setError("");
    setChallenge(null);
    try {
      const response = await fetch(`${base}/start`, { method: "POST", credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "สร้าง QR ไม่สำเร็จ");
      const expiresAt = Date.now() + data.expiresIn * 1000;
      setChallenge({ code: data.code, qrDataUrl: data.qrDataUrl, lineUrl: data.lineUrl, expiresAt });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้าง QR ไม่สำเร็จ");
    } finally {
      requesting.current = false;
      setBusy(false);
    }
  }

  return { display, base, challenge, setChallenge, busy, error, setError, createChallenge };
}

export default function QrLogin({ t, qr }: { t: Dictionary["login"]; qr: ReturnType<typeof useQrChallenge> }): React.ReactNode {
  const { display, base, challenge, setChallenge, busy, error, setError, createChallenge } = qr;
  const [approved, setApproved] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    challenge ? Math.max(0, Math.ceil((challenge.expiresAt - Date.now()) / 1000)) : 0,
  );

  useEffect(() => {
    if (!challenge) return;
    let stopped = false;
    let polling = false;
    const tick = () => {
      if (stopped) return;
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
        const response = await fetch(`${base}/claim`, { method: "POST", credentials: "same-origin", cache: "no-store" });
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
  }, [base, challenge, setChallenge, setError]);

  return <div className="space-y-3">
    <p className="text-sm leading-6 text-muted">{display ? "ใช้กล้องมือถือสแกน QR แล้วกดยืนยันบนมือถือเพื่อเปิดจอนี้" : t.qrIntro}</p>
    {error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
    {challenge ? <>
      <div className="flex flex-col items-center rounded-2xl border border-blue-100 bg-white p-3 text-center">
        <Image unoptimized src={challenge.qrDataUrl} width={240} height={240} alt={t.qrTab} className="size-[clamp(156px,22dvh,210px)]" />
        <p className="mt-2 break-all font-mono text-base font-bold tracking-wide text-ink-strong">{!display && "LOGIN "}{challenge.code}</p>
        <p className="mt-1 text-xs text-muted">{display ? "ตรวจรหัสนี้บนมือถือก่อนยืนยัน" : t.qrCode}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-x-2 text-center text-sm font-semibold text-brand-ink">
        <p role="status">{approved ? t.submitting : t.qrWaiting}</p>
        {!approved && <p role="timer">{t.qrExpires} {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {!display && <Button asChild variant="outline"><a href={challenge.lineUrl} target="_blank" rel="noreferrer">{t.qrOpenLine}</a></Button>}
        <Button type="button" variant="outline" onClick={() => void createChallenge(true)} disabled={busy || approved}>{t.qrRefresh}</Button>
      </div>
    </> : busy ? (
      <div role="status" aria-busy="true" className="grid min-h-44 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-sm font-semibold text-brand-ink">
        {t.qrPreparing}
      </div>
    ) : (
      <Button type="button" className="w-full" size="lg" onClick={() => void createChallenge(true)}>{display ? "แสดง QR สำหรับเข้าสู่จอ" : t.qrRefresh}</Button>
    )}
    <p className="text-xs leading-5 text-muted">{display ? "ใช้บัญชีจุดสแกนของโรงเรียนในการยืนยัน" : t.qrLinkedOnly}</p>
  </div>;
}


export function DisplayQrLogin({ t }: { t: Dictionary["login"] }) {
  const qr = useQrChallenge(true);
  return <QrLogin t={t} qr={qr} />;
}
