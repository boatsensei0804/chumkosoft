"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Icon from "@/features/dashboard/components/icon";
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

const RESULT_META: Record<ScanStatus, { title: string; bg: string; fg: string; icon: string }> = {
  matched: { title: "เช็คชื่อสำเร็จ", bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)", icon: "success" },
  already: { title: "เช็คชื่อไปแล้ววันนี้", bg: "var(--brand-soft)", fg: "var(--brand-ink)", icon: "info" },
  no_match: { title: "ไม่รู้จักใบหน้านี้", bg: "var(--warning-soft)", fg: "oklch(0.5 0.12 55)", icon: "warning" },
  not_ready: { title: "ยังไม่พร้อมใช้งาน", bg: "var(--surface-sunken)", fg: "var(--muted)", icon: "info" },
  closed: { title: "ยังไม่ถึงเวลาเปิดสแกน", bg: "var(--surface-sunken)", fg: "var(--muted)", icon: "time" },
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
        if (identity.status !== "candidate" || !identity.studentId) return;

        const now = Date.now();
        const cx = detection.box.x + detection.box.width / 2;
        const cy = detection.box.y + detection.box.height / 2;
        hitsRef.current = [...hitsRef.current.filter((h) => now - h.t <= LIVENESS_WINDOW_MS), { id: identity.studentId, cx, cy, t: now }];

        if (!passesLiveness(hitsRef.current, identity.studentId, now)) return;

        const scan = await confirmCheckInAction(identity.studentId);
        if (scan.status !== "no_match" && scan.status !== "not_ready") {
          setResult(scan);
          hitsRef.current = [];
          cooldownUntilRef.current = Date.now() + RESULT_HOLD_MS;
        }
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
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px]"
        style={{ backgroundColor: "oklch(0.2 0.02 260)", border: "1px solid var(--line)" }}
      >
        <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" aria-label="ภาพจากกล้องสแกนใบหน้า" />

        {phase !== "scanning" && (
          <div className="absolute inset-0 grid place-items-center" style={{ backgroundColor: "color-mix(in oklch, oklch(0.2 0.02 260) 70%, transparent)" }}>
            {phase === "starting" ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <CircularProgress sx={{ color: "var(--on-primary)" }} />
                <p className="text-[14px] font-medium" style={{ color: "var(--on-primary)" }}>กำลังเปิดกล้องและโหลดโมเดล…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <span className="grid size-14 place-items-center rounded-full" style={{ backgroundColor: "color-mix(in oklch, var(--on-primary) 15%, transparent)", color: "var(--on-primary)" }}>
                  <Icon name="face" sx={{ fontSize: 30 }} />
                </span>
                {phase === "error" ? (
                  <p className="max-w-sm text-[13.5px]" style={{ color: "var(--on-primary)" }}>{errorMsg}</p>
                ) : (
                  <p className="text-[14px] font-medium" style={{ color: "var(--on-primary)" }}>กดปุ่มด้านล่างเพื่อเริ่มสแกน</p>
                )}
                <Button variant="contained" onClick={() => void start()} startIcon={<Icon name="face" sx={{ fontSize: 18 }} />}>
                  {phase === "error" ? "ลองอีกครั้ง" : "เริ่มสแกน"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "scanning" && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 size-52 -translate-x-1/2 -translate-y-1/2 rounded-[24px]" style={{ border: "2px dashed color-mix(in oklch, var(--on-primary) 55%, transparent)" }} />
            {beforeWindow ? (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: "color-mix(in oklch, var(--on-primary) 15%, transparent)", color: "var(--on-primary)" }}>
                <Icon name="time" sx={{ fontSize: 14 }} />
                ยังไม่ถึงเวลาเปิดสแกน · เริ่ม {scanStartTime} น.
              </span>
            ) : (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: "color-mix(in oklch, var(--danger) 90%, transparent)", color: "var(--on-primary)" }}>
                <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                กำลังสแกน
              </span>
            )}
          </div>
        )}

        {result && result.status !== "no_match" && (
          <div className="absolute inset-x-0 bottom-0 p-3" role="status" aria-live="assertive">
            <div className="flex items-center gap-3 rounded-[14px] px-4 py-3" style={{ backgroundColor: RESULT_META[result.status].bg, border: `1px solid ${RESULT_META[result.status].fg}` }}>
              <Icon name={RESULT_META[result.status].icon} sx={{ fontSize: 26, color: RESULT_META[result.status].fg }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-bold" style={{ color: RESULT_META[result.status].fg }}>{RESULT_META[result.status].title}</p>
                  {result.late && (result.status === "matched" || result.status === "already") && (
                    <span className="rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: "var(--warning-soft)", color: "oklch(0.5 0.12 55)" }}>
                      มาสาย
                    </span>
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
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="time" sx={{ fontSize: 15, color: "var(--faint)" }} />
          เปิดสแกน {scanStartTime} น. · หลัง {lateAfterTime} น. นับเป็นสาย
        </span>
        {phase === "scanning" && (
          <Button variant="outlined" size="small" onClick={stop} startIcon={<Icon name="close" sx={{ fontSize: 16 }} />}>
            หยุดสแกน
          </Button>
        )}
      </div>
    </div>
  );
}
