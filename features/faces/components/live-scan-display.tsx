"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LogIn, LogOut, Maximize, Minimize, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import Mascot from "@/components/ui/mascot";
import type { LiveScan } from "@/features/faces/live-scan";

export default function LiveScanDisplay({ deviceId, hasDevices }: { deviceId: string | null; hasDevices: boolean }) {
  const [scan, setScan] = useState<LiveScan | null>(null);
  const [history, setHistory] = useState<LiveScan[]>([]);
  const [paused, setPaused] = useState(false);
  const [connection, setConnection] = useState<"connecting" | "ready" | "error" | "expired">("connecting");
  const [fullScreen, setFullScreen] = useState(false);
  const [fullScreenError, setFullScreenError] = useState(false);
  const screen = useRef<HTMLElement>(null);

  useEffect(() => {
    const sync = () => setFullScreen(document.fullscreenElement === screen.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!hasDevices) return;
    let active = true;
    let request: AbortController | undefined;
    let pollTimer: number | undefined;
    let clearTimer: number | undefined;

    async function poll() {
      const started = performance.now();
      request = new AbortController();
      const requestTimeout = window.setTimeout(() => request?.abort(), 6000);
      try {
        const query = deviceId ? `?device=${encodeURIComponent(deviceId)}` : "";
        const response = await fetch(`/api/scanner/live${query}`, {
          cache: "no-store",
          signal: request.signal,
        });
        if (!active) return;
        if (response.status === 401 || response.status === 403) {
          setHistory([]);
          setScan(null);
          setConnection("expired");
          return;
        }
        if (!response.ok) throw new Error("Live scan unavailable");
        const { scan: next, history: recent, paused: asleep }: { scan: LiveScan | null; history: LiveScan[]; paused: boolean } = await response.json();
        if (!active) return;
        setHistory(recent);
        setPaused(asleep);
        const remaining = next ? next.visibleForMs - (performance.now() - started) : 0;
        setScan(remaining > 0 ? next : null);
        setConnection("ready");
        window.clearTimeout(clearTimer);
        if (remaining > 0) clearTimer = window.setTimeout(() => setScan(null), remaining);
      } catch {
        if (!active) return;
        setScan(null);
        setHistory([]);
        setConnection("error");
      } finally {
        window.clearTimeout(requestTimeout);
      }
      pollTimer = window.setTimeout(poll, 1800);
    }

    void poll();
    return () => {
      active = false;
      request?.abort();
      window.clearTimeout(pollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [deviceId, hasDevices]);

  const leaving = scan?.direction === "out";
  const readyText = !hasDevices ? "ยังไม่มีเครื่องที่เชื่อมไว้"
    : connection === "expired" ? "กรุณาเข้าสู่ระบบจุดสแกนอีกครั้ง"
    : connection === "error" ? "กำลังลองเชื่อมต่อใหม่"
    : connection === "connecting" ? "กำลังเชื่อมต่อ" : "รอการสแกน";
  const ResultIcon = !scan ? ScanFace : leaving ? LogOut : LogIn;

  async function toggleFullScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await screen.current?.requestFullscreen();
      setFullScreenError(false);
    } catch {
      setFullScreenError(true);
    }
  }

  return (
    <main ref={screen} className="relative isolate flex flex-1 flex-col bg-card fullscreen:overflow-y-auto">
      {paused && connection === "ready" ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950 text-slate-400">พักหน้าจอ</div> : <section aria-labelledby="scanner-display-title" className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-5 sm:px-10 md:py-7">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <h1 id="scanner-display-title" className="text-sm font-semibold text-muted sm:text-base">จอแสดงผลการสแกน</h1>
          <Button variant="outline" className="min-h-11 rounded-full px-4 shadow-none" onClick={toggleFullScreen}>
            {fullScreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
            {fullScreen ? "ออกจากเต็มจอ" : "เปิดเต็มจอ"}
          </Button>
        </div>
        {fullScreenError && <p className="mt-2 text-sm text-muted" role="status">เบราว์เซอร์นี้เปิดโหมดเต็มจอไม่ได้</p>}

        <div className="grid min-h-0 flex-1 items-center md:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)]">
          <div role="status" aria-live="polite" aria-atomic="true" className="relative z-10 min-w-0 pt-10 pb-5 md:py-12">
            <div className={`mb-6 flex w-fit items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold sm:text-base ${scan && !leaving ? "bg-success-soft text-success" : "bg-brand-soft text-brand-ink"}`}>
              <ResultIcon className="size-5 shrink-0" aria-hidden="true" />
              {scan ? leaving ? "บันทึกออกจากโรงเรียนแล้ว" : "บันทึกเข้าโรงเรียนแล้ว" : "สแกนเข้า–ออกโรงเรียน"}
            </div>
            {scan ? (
              <>
                <h2 className="wrap-break-word text-5xl font-bold leading-tight text-ink-strong sm:text-[clamp(3.4rem,6vw,6rem)]">{scan.firstName || "สแกนสำเร็จ"}</h2>
                <p className="mt-4 flex items-center gap-2 text-xl font-semibold tabular-nums text-muted sm:text-2xl">
                  <Check className="size-5 shrink-0 text-success" aria-hidden="true" />
                  {scan.alreadyRecorded && "สแกนซ้ำ · "}{scan.time && scan.time + " น."}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-balance text-4xl font-bold leading-tight text-ink-strong sm:text-[clamp(3rem,5.5vw,5.5rem)]">{readyText}</h2>
                {hasDevices && connection === "ready" && <p className="mt-4 max-w-[32ch] text-pretty text-base leading-relaxed text-muted sm:text-xl">สแกนที่เครื่องในโหมดเข้าโรงเรียนหรือออกโรงเรียน แล้วดูผลบนจอนี้</p>}
              </>
            )}
          </div>

          <div className="relative grid min-h-65 place-items-center md:min-h-[min(64vh,620px)]">
            <div aria-hidden="true" className="absolute top-1/2 left-1/2 -z-10 aspect-square w-[88%] max-w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-linear-to-br from-card via-surface to-brand-soft" />
            <div aria-hidden="true" className="absolute top-1/2 left-1/2 -z-10 aspect-square w-[72%] max-w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-surface/70" />
            <Mascot
              pose={scan ? (leaving ? "checkout" : "success") : "scan"}
              size={420}
              decorative
              className="size-58 sm:size-76 lg:size-105"
              priority
            />
          </div>
        </div>
        {history.length > 0 && <section className="mb-5 rounded-xl border border-line p-4"><h2 className="font-bold">รายการสแกนก่อนหน้า</h2>
          <ul className="mt-2 divide-y divide-line">{history.map(row => <li key={row.id} className="flex flex-wrap justify-between gap-3 py-2">
            <span>{row.firstName}</span><span>{row.direction === "in" ? "เข้าโรงเรียน" : "ออกโรงเรียน"} {row.time && row.time + " น."}</span>
          </li>)}</ul></section>}
        {connection === "expired" && <a href="/kiosk/login" className="text-brand underline">เข้าสู่จอ Kiosk อีกครั้ง</a>}
      </section>}
    </main>
  );
}
