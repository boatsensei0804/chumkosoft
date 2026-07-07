"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Icon from "@/features/dashboard/components/icon";
import { uploadFaceAction } from "@/features/faces/actions";
import { loadFaceApi, detectDescriptor, fileToImage, resizeToJpeg } from "@/features/faces/lib/face-client";
import FaceCameraDialog from "./face-camera-dialog";

interface FileStatus {
  name: string;
  state: "processing" | "done" | "failed";
  detail?: string;
}

interface FaceUploaderProps {
  studentId: string;
  studentName: string;
}

/**
 * Enrolls face photos: for each picked file, detect exactly one face in the
 * browser (face-api.js), compute its descriptor, downscale the photo, then send
 * both to the server action. Files without a detectable face are rejected here
 * so the dataset only ever contains usable templates.
 */
export default function FaceUploader({ studentId, studentName }: FaceUploaderProps): React.ReactNode {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);

  function patchStatus(index: number, patch: Partial<FileStatus>): void {
    setStatuses((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    const picked = [...files];
    setBusy(true);
    setStatuses(picked.map((f) => ({ name: f.name, state: "processing" as const })));

    try {
      setModelLoading(true);
      await loadFaceApi();
    } catch {
      setStatuses(picked.map((f) => ({ name: f.name, state: "failed" as const, detail: "โหลดโมเดลไม่สำเร็จ" })));
      setModelLoading(false);
      setBusy(false);
      return;
    }
    setModelLoading(false);

    let uploadedAny = false;
    for (let i = 0; i < picked.length; i++) {
      const file = picked[i];
      try {
        const image = await fileToImage(file);
        const detection = await detectDescriptor(image);
        if (!detection.ok) {
          patchStatus(i, {
            state: "failed",
            detail: detection.reason === "no-face" ? "ไม่พบใบหน้าในรูป" : "ประมวลผลรูปไม่สำเร็จ",
          });
          URL.revokeObjectURL(image.src);
          continue;
        }

        const blob = await resizeToJpeg(image);
        URL.revokeObjectURL(image.src);

        const formData = new FormData();
        formData.append("studentId", studentId);
        formData.append("descriptor", JSON.stringify(detection.descriptor));
        formData.append("image", blob, "face.jpg");

        const result = await uploadFaceAction(formData);
        if (result.ok) {
          uploadedAny = true;
          patchStatus(i, { state: "done", detail: "เพิ่มแล้ว" });
        } else {
          patchStatus(i, { state: "failed", detail: result.message ?? "อัปโหลดไม่สำเร็จ" });
        }
      } catch {
        patchStatus(i, { state: "failed", detail: "ประมวลผลรูปไม่สำเร็จ" });
      }
    }

    setBusy(false);
    if (uploadedAny) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        aria-label={`เลือกรูปใบหน้าของ ${studentName}`}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="contained"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          startIcon={<Icon name="add" sx={{ fontSize: 18 }} />}
        >
          {busy ? "กำลังประมวลผล…" : "อัปโหลดรูป"}
        </Button>
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() => setCameraOpen(true)}
          startIcon={<Icon name="face" sx={{ fontSize: 18 }} />}
        >
          ถ่ายด้วยกล้อง
        </Button>
      </div>
      <p className="text-[12.5px] text-muted">
        แนะนำ 3–5 รูปต่อคน หน้าตรง แสงสว่าง เห็นใบหน้าชัดเจน ระบบจะตรวจหาใบหน้าก่อนบันทึก
      </p>

      <FaceCameraDialog
        open={cameraOpen}
        studentId={studentId}
        studentName={studentName}
        onClose={() => setCameraOpen(false)}
        onUploaded={() => router.refresh()}
      />

      {modelLoading && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[12.5px] text-muted">กำลังโหลดโมเดลตรวจจับใบหน้า (ครั้งแรกเท่านั้น)…</p>
          <LinearProgress />
        </div>
      )}

      {statuses.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-live="polite">
          {statuses.map((s, i) => (
            <li key={`${s.name}-${i}`}>
              <Alert
                severity={s.state === "done" ? "success" : s.state === "failed" ? "error" : "info"}
                sx={{ borderRadius: "var(--radius-sm)", py: 0.25 }}
              >
                <span className="font-semibold">{s.name}</span>
                {" — "}
                {s.state === "processing" ? "กำลังตรวจหาใบหน้า…" : s.detail}
              </Alert>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
