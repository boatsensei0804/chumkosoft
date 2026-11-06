"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ScanFace, Clock, X, CheckCircle2, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadFaceApi, detectFaceForScan } from "@/features/faces/lib/face-client";
import { identifyFaceAction, confirmCheckInAction } from "@/features/faces/scan-actions";
import type { ScanResult, ScanStatus } from "@/features/faces/services/scan-service";

type Phase = "idle" | "starting" | "scanning" | "error";

const SCAN_INTERVAL_MS = 1200;
const RESULT_HOLD_MS = 3500;

const LIVENESS_WINDOW_MS = 4000;
const LIVENESS_MIN_HITS = 2;
const LIVENESS_MIN_MOVE = 4;

interface LivenessHit {
  id: string;
  cx: number;
  cy: number;
  t: number;
}

function passesLiveness(hits: LivenessHit[], studentId: string, now: number): boolean {
  const recent = hits.filter((h) => h.id === studentId && now - h.t <= LIVENESS_WINDOW_MS);
  if (recent.length < LIVENESS_MIN_HITS) return false;
  const xs = recent.map((h) => h.cx);
  const ys = recent.map((h) => h.cy);
  const movement = Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys));
  return movement >= LIVENESS_MIN_MOVE;
}

const nowHMFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false });
function bangkokNowHM(): string {
  return nowHMFmt.format(new Date());
}

const RESULT_META: Record<ScanStatus, { title: string; bg: string; fg: string; icon: LucideIcon }> = {
  matched: { title: "เช็คชื่อสำเร็จ", bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)", icon: CheckCircle2 },
  already: { title: "เช็คชื่อไปแล้ววันนี้", bg: "var(--brand-soft)", fg: "var(--brand-ink)", icon: Info },
  no_match: { title: "ไม่รู้จักใบหน้านี้", bg: "var(--warning-soft)", fg: "oklch(0.5 0.12 55)", icon: TriangleAlert },
  not_ready: { title: "ยังไม่พร้อมใช้งาน", bg: "var(--surface-sunken)", fg: "var(--muted)", icon: Info },
  closed: { title: "ยังไม่ถึงเวลาเปิดสแกน", bg: "var(--surface-sunken)", fg: "var(--muted)", icon: Clock },
};

interface ScanStationProps {
  scanStartTime: string;
  lateAfterTime: string;
}

export default function ScanStation({ scanStartTime, lateAfterTime }: ScanStationProps): React.ReactNode {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const hitsRef = useRef<LivenessHit[]>([]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [beforeWindow, setBeforeWindow] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPhase("idle");
  }, []);

  const start = useCallback(async () => {
    setPhase("starting");
    setErrorMsg("");
    try {
      await loadFaceApi();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("scanning");
    } catch {
      setErrorMsg("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้อง และเปิดผ่าน HTTPS หรือ localhost");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (phase !== "scanning") return;
    let active = true;

    const tick = async (): Promise<void> => {
      if (!active) return;
      const video = videoRef.current;
      if (!video || busyRef.current || Date.now() < cooldownUntilRef.current || video.readyState < 2) return;

      // Gate closed before the school's opening time — don't scan yet.
      if (bangkokNowHM() < scanStartTime) {
        setBeforeWindow(true);
        return;
      }
      setBeforeWindow(false);

      busyRef.current = true;
      try {
        const detection = await detectFaceForScan(video);
        if (!detection.ok) return;

        const identity = await identifyFaceAction(detection.descriptor);
        if (identity.status === "no_match" || identity.status === "not_ready") {
          setResult({ status: identity.status });
          hitsRef.current = [];
          cooldownUntilRef.current = Date.now() + RESULT_HOLD_MS;
          return;
        }
        if (!identity.studentId) return;

        const now = Date.now();
        const cx = detection.box.x + detection.box.width / 2;
        const cy = detection.box.y + detection.box.height / 2;
        hitsRef.current = [...hitsRef.current.filter((h) => now - h.t <= LIVENESS_WINDOW_MS), { id: identity.studentId, cx, cy, t: now }];

        if (!passesLiveness(hitsRef.current, identity.studentId, now)) return;

        const scan = await confirmCheckInAction(identity.studentId);
        setResult(scan);
        hitsRef.current = [];
        cooldownUntilRef.current = Date.now() + RESULT_HOLD_MS;
      } catch {
        // transient — keep scanning
      } finally {
        busyRef.current = false;
      }
    };

    const id = setInterval(() => void tick(), SCAN_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [phase, scanStartTime]);

  useEffect(() => {
    if (!result) return;
    const id = setTimeout(() => setResult(null), RESULT_HOLD_MS);
    return () => clearTimeout(id);
  }, [result]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-[oklch(0.2_0.02_260)]">
        <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" aria-label="ภาพจากกล้องสแกนใบหน้า" />

        {phase !== "scanning" && (
          <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_oklch,oklch(0.2_0.02_260)_70%,transparent)]">
            {phase === "starting" ? (
              <div className="flex flex-col items-center gap-3 text-center text-[var(--on-primary)]">
                <Loader2 className="size-9 animate-spin" />
                <p className="text-[14px] font-medium">กำลังเปิดกล้องและโหลดโมเดล…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center text-[var(--on-primary)]">
                <span className="grid size-14 place-items-center rounded-full bg-[color-mix(in_oklch,var(--on-primary)_15%,transparent)]">
                  <ScanFace className="size-8" />
                </span>
                {phase === "error" ? <p className="max-w-sm text-[13.5px]">{errorMsg}</p> : <p className="text-[14px] font-medium">กดปุ่มด้านล่างเพื่อเริ่มสแกน</p>}
                <Button onClick={() => void start()}>
                  <ScanFace className="size-[18px]" /> {phase === "error" ? "ลองอีกครั้ง" : "เริ่มสแกน"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "scanning" && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 size-52 -translate-x-1/2 -translate-y-1/2 rounded-[24px] border-2 border-dashed border-[color-mix(in_oklch,var(--on-primary)_55%,transparent)]" />
            {beforeWindow ? (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklch,var(--on-primary)_15%,transparent)] px-2.5 py-1 text-[12px] font-semibold text-[var(--on-primary)]">
                <Clock className="size-3.5" />
                ยังไม่ถึงเวลาเปิดสแกน · เริ่ม {scanStartTime} น.
              </span>
            ) : (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklch,var(--danger)_90%,transparent)] px-2.5 py-1 text-[12px] font-semibold text-[var(--on-primary)]">
                <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                กำลังสแกน
              </span>
            )}
          </div>
        )}

        {result && (
          <div className="absolute inset-x-0 bottom-0 p-3" role="status" aria-live="assertive">
            {(() => {
              const meta = RESULT_META[result.status];
              const Icon = meta.icon;
              return (
                <div className="flex items-center gap-3 rounded-[14px] px-4 py-3" style={{ backgroundColor: meta.bg, border: `1px solid ${meta.fg}` }}>
                  <Icon className="size-7 shrink-0" style={{ color: meta.fg }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold" style={{ color: meta.fg }}>
                        {meta.title}
                      </p>
                      {result.late && (result.status === "matched" || result.status === "already") && (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11.5px] font-semibold text-[oklch(0.5_0.12_55)]">มาสาย</span>
                      )}
                    </div>
                    {result.studentName && (
                      <p className="truncate text-[13.5px] text-ink-strong">
                        {result.studentName}
                        {result.classroom ? ` · ${result.classroom}` : ""}
                        {result.time ? ` · ${result.time} น.` : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-[15px] text-faint" />
          เปิดสแกน {scanStartTime} น. · หลัง {lateAfterTime} น. นับเป็นสาย
        </span>
        {phase === "scanning" && (
          <Button variant="outline" size="sm" onClick={stop}>
            <X className="size-4" /> หยุดสแกน
          </Button>
        )}
      </div>
    </div>
  );
}
