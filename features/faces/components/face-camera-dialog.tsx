"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Icon from "@/features/dashboard/components/icon";
import { uploadFaceAction } from "@/features/faces/actions";
import { loadFaceApi, detectDescriptor, captureVideoJpeg } from "@/features/faces/lib/face-client";

type Phase = "starting" | "ready" | "capturing" | "error";
type Feedback = { severity: "success" | "error" | "info"; message: string };

interface FaceCameraDialogProps {
  open: boolean;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onUploaded: () => void;
}

/**
 * Captures face photos straight from the webcam: on each shot we detect a single
 * face in the live frame (face-api.js), grab that frame as a JPEG, and send both
 * to the same enrol action the file uploader uses. Shots without a detectable
 * face are rejected so the dataset only holds usable templates.
 */
export default function FaceCameraDialog({ open, studentId, studentName, onClose, onUploaded }: FaceCameraDialogProps): React.ReactNode {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [count, setCount] = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // No synchronous setState before the first await, so this is safe to invoke
  // directly from the open effect (react-hooks/set-state-in-effect).
  const startCamera = useCallback(async () => {
    try {
      await loadFaceApi();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("ready");
    } catch {
      setErrorMsg("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้อง และเปิดผ่าน HTTPS หรือ localhost");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Defer to the next frame so state updates happen in a callback, not directly
    // in the effect body, and the <video> ref is attached before we attach the stream.
    const frame = requestAnimationFrame(() => void startCamera());
    return () => {
      cancelAnimationFrame(frame);
      stopStream();
    };
  }, [open, startCamera, stopStream]);

  function retry(): void {
    setPhase("starting");
    setErrorMsg("");
    void startCamera();
  }

  function handleClose(): void {
    stopStream();
    setPhase("starting");
    setCount(0);
    setFeedback(null);
    onClose();
  }

  async function capture(): Promise<void> {
    const video = videoRef.current;
    if (!video || phase !== "ready") return;
    setPhase("capturing");
    setFeedback(null);
    try {
      const detection = await detectDescriptor(video);
      if (!detection.ok) {
        setFeedback({ severity: "error", message: detection.reason === "no-face" ? "ไม่พบใบหน้าในภาพ ลองจัดหน้าให้อยู่กลางกรอบแล้วถ่ายใหม่" : "ประมวลผลไม่สำเร็จ ลองใหม่อีกครั้ง" });
        return;
      }
      const blob = await captureVideoJpeg(video);
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("descriptor", JSON.stringify(detection.descriptor));
      formData.append("image", blob, "face.jpg");

      const result = await uploadFaceAction(formData);
      if (result.ok) {
        setCount((c) => c + 1);
        setFeedback({ severity: "success", message: "บันทึกรูปเรียบร้อย ถ่ายเพิ่มได้อีก" });
        onUploaded();
      } else {
        setFeedback({ severity: "error", message: result.message ?? "อัปโหลดไม่สำเร็จ" });
      }
    } catch {
      setFeedback({ severity: "error", message: "ถ่ายภาพไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setPhase((p) => (p === "capturing" ? "ready" : p));
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="camera-title">
      <DialogTitle id="camera-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        ถ่ายรูปใบหน้า · {studentName}
      </DialogTitle>
      <DialogContent>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[12px]" style={{ backgroundColor: "oklch(0.2 0.02 260)", border: "1px solid var(--line)" }}>
          <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" aria-label={`กล้องสำหรับถ่ายใบหน้าของ ${studentName}`} />

          {phase !== "error" && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-[24px]" style={{ border: "2px dashed color-mix(in oklch, var(--on-primary) 55%, transparent)" }} />
          )}

          {(phase === "starting" || phase === "capturing") && (
            <div className="absolute inset-0 grid place-items-center" style={{ backgroundColor: "color-mix(in oklch, oklch(0.2 0.02 260) 55%, transparent)" }}>
              <div className="flex flex-col items-center gap-2 text-center">
                <CircularProgress size={28} sx={{ color: "var(--on-primary)" }} />
                <p className="text-[13px] font-medium" style={{ color: "var(--on-primary)" }}>
                  {phase === "starting" ? "กำลังเปิดกล้อง…" : "กำลังตรวจหาใบหน้า…"}
                </p>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <Icon name="warning" sx={{ fontSize: 30, color: "var(--on-primary)" }} />
                <p className="max-w-sm text-[13px]" style={{ color: "var(--on-primary)" }}>{errorMsg}</p>
                <Button variant="contained" size="small" onClick={retry}>
                  ลองอีกครั้ง
                </Button>
              </div>
            </div>
          )}

          {count > 0 && (
            <span className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: "var(--brand)", color: "var(--on-primary)" }}>
              เพิ่มแล้ว {count} รูป
            </span>
          )}
        </div>

        {feedback && (
          <Alert severity={feedback.severity} sx={{ mt: 2, borderRadius: "var(--radius-sm)" }}>
            {feedback.message}
          </Alert>
        )}
        <p className="mt-2 text-[12.5px] text-muted">จัดใบหน้าให้อยู่ในกรอบ หน้าตรง แสงสว่าง แล้วกด “ถ่ายภาพ” · ถ่ายได้หลายรูปต่อคน</p>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} variant="text">
          เสร็จสิ้น
        </Button>
        <Button onClick={() => void capture()} variant="contained" disabled={phase !== "ready"} startIcon={<Icon name="face" sx={{ fontSize: 18 }} />}>
          {phase === "capturing" ? "กำลังบันทึก…" : "ถ่ายภาพ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
