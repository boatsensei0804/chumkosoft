"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Switch from "@mui/material/Switch";
import Icon from "@/features/dashboard/components/icon";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import FaceUploader from "./face-uploader";
import { deleteFaceTemplateAction, setFaceConsentAction } from "@/features/faces/actions";
import type { FaceStudentRow, FaceStudentDetail, FaceTemplateView } from "../types";

interface FacesBrowserProps {
  students: FaceStudentRow[];
  selected: FaceStudentDetail | null;
}

export default function FacesBrowser({ students, selected }: FacesBrowserProps): React.ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<FaceTemplateView | null>(null);
  const [isDeletePending, startDelete] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.classroom.toLowerCase().includes(q),
    );
  }, [students, query]);

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteFaceTemplateAction(deleting.id);
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "ลบเรียบร้อย" : "ลบไม่สำเร็จ") });
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
      {/* Student list */}
      <div
        className="flex flex-col overflow-hidden rounded-[16px]"
        style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="p-3" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="flex items-center gap-2 rounded-[10px] px-3 py-2" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <Icon name="search" sx={{ fontSize: 18, color: "var(--faint)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อ รหัส หรือชั้น…"
              aria-label="ค้นหานักเรียน"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </div>
        </div>

        <ul className="flex max-h-[560px] flex-col overflow-y-auto">
          {results.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-faint">ไม่พบนักเรียน</li>}
          {results.map((s) => {
            const active = selected?.id === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/faces?student=${s.id}`)}
                  aria-current={active ? "true" : undefined}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{
                    backgroundColor: active ? "var(--brand-soft)" : "transparent",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "var(--brand-soft)", color: "var(--brand-ink)", fontSize: 13 }}>
                    {s.name.replace(/^[^ก-๙A-Za-z]*/, "").charAt(0) || "?"}
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink-strong">{s.name}</span>
                    <span className="tabular block text-[12px] text-muted">
                      {s.code} · {s.classroom}
                    </span>
                  </span>
                  <span
                    className="tabular shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
                    style={
                      s.templateCount > 0
                        ? { backgroundColor: "var(--success-soft)", color: "oklch(0.42 0.1 152)" }
                        : { backgroundColor: "var(--surface-sunken)", color: "var(--faint)" }
                    }
                  >
                    {s.templateCount > 0 ? `${s.templateCount} รูป` : "ยังไม่มี"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Selected student panel */}
      {selected ? (
        <div
          className="flex flex-col gap-5 rounded-[16px] p-5"
          style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
        >
          <div>
            <h2 className="text-[16px] font-bold text-ink-strong">{selected.name}</h2>
            <p className="tabular text-[12.5px] text-muted">
              รหัส {selected.code} · {selected.templates.length} รูปในชุดข้อมูล
            </p>
          </div>

          <ConsentPanel
            studentId={selected.id}
            consent={selected.consent}
            consentAt={selected.consentAt}
            onResult={(r) => {
              setToast({ severity: r.ok ? "success" : "error", message: r.message ?? "" });
              if (r.ok) router.refresh();
            }}
          />

          {selected.consent ? (
            <FaceUploader studentId={selected.id} studentName={selected.name} />
          ) : (
            <div className="flex items-center gap-2.5 rounded-[12px] px-4 py-3" style={{ backgroundColor: "var(--warning-soft)", border: "1px solid oklch(0.85 0.09 75)" }}>
              <Icon name="warning" sx={{ fontSize: 18, color: "oklch(0.5 0.12 55)" }} />
              <p className="text-[13px] text-ink">บันทึกความยินยอมของผู้ปกครองก่อน จึงจะเพิ่มรูปใบหน้าได้</p>
            </div>
          )}

          {selected.templates.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {selected.templates.map((t) => (
                <li
                  key={t.id}
                  className="group relative overflow-hidden rounded-[12px]"
                  style={{ border: "1px solid var(--line)", backgroundColor: "var(--surface-2)" }}
                >
                  <Image
                    src={t.imageUrl}
                    alt={`รูปใบหน้าของ ${selected.name} เพิ่มเมื่อ ${t.createdAt}`}
                    width={320}
                    height={320}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="tabular text-[11.5px] text-muted">{t.createdAt}</span>
                    <Tooltip title="ลบรูปนี้" arrow>
                      <IconButton size="small" aria-label={`ลบรูปที่เพิ่มเมื่อ ${t.createdAt}`} onClick={() => setDeleting(t)}>
                        <Icon name="delete" sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-[12px] px-6 py-12 text-center" style={{ backgroundColor: "var(--surface)", border: "1px dashed var(--line-strong)" }}>
              <Icon name="face" sx={{ fontSize: 30, color: "var(--faint)" }} />
              <p className="text-[14px] font-semibold text-ink-strong">ยังไม่มีรูปใบหน้า</p>
              <p className="max-w-xs text-[12.5px] text-muted">เพิ่มรูปเพื่อให้จุดสแกนจดจำนักเรียนคนนี้ได้ อย่าลืมขอความยินยอมจากผู้ปกครองก่อน</p>
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-[16px] px-6 py-20 text-center"
          style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}
        >
          <span className="grid size-12 place-items-center rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }} aria-hidden="true">
            <Icon name="face" sx={{ fontSize: 24 }} />
          </span>
          <p className="text-[15px] font-semibold text-ink-strong">เลือกนักเรียนจากรายการ</p>
          <p className="max-w-sm text-[13.5px] text-muted">เลือกนักเรียนทางซ้ายเพื่อดูและเพิ่มรูปใบหน้าในชุดข้อมูลสำหรับการสแกนเช็คชื่อ</p>
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="ลบรูปใบหน้า"
        message="ต้องการลบรูปนี้ออกจากชุดข้อมูลใช่หรือไม่? จุดสแกนจะไม่ใช้รูปนี้ในการจดจำอีก"
        confirmLabel="ลบรูป"
        destructive
        pending={isDeletePending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: "var(--radius-sm)" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </div>
  );
}

function ConsentPanel({
  studentId,
  consent,
  consentAt,
  onResult,
}: {
  studentId: string;
  consent: boolean;
  consentAt: string | null;
  onResult: (r: { ok: boolean; message?: string }) => void;
}): React.ReactNode {
  const [pending, startToggle] = useTransition();

  function toggle(next: boolean): void {
    startToggle(async () => {
      onResult(await setFaceConsentAction(studentId, next));
    });
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[12px] px-4 py-3"
      style={{
        backgroundColor: consent ? "var(--success-soft)" : "var(--surface-2)",
        border: `1px solid ${consent ? "oklch(0.82 0.1 152)" : "var(--line)"}`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <Icon name={consent ? "success" : "info"} sx={{ fontSize: 18, color: consent ? "oklch(0.42 0.1 152)" : "var(--muted)", marginTop: "1px" }} />
        <div>
          <p className="text-[13.5px] font-semibold text-ink-strong">ความยินยอมของผู้ปกครอง (PDPA)</p>
          <p className="text-[12.5px] text-muted">
            {consent ? `ได้รับความยินยอมแล้ว${consentAt ? ` เมื่อ ${consentAt}` : ""}` : "ยังไม่ได้บันทึกความยินยอมให้จัดเก็บข้อมูลใบหน้า"}
          </p>
        </div>
      </div>
      <Switch
        checked={consent}
        disabled={pending}
        onChange={(e) => toggle(e.target.checked)}
        slotProps={{ input: { "aria-label": "บันทึกความยินยอมของผู้ปกครอง" } }}
      />
    </div>
  );
}
