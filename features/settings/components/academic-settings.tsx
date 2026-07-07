"use client";

import { useState, useTransition } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Icon from "@/features/dashboard/components/icon";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import YearFormDialog from "./year-form-dialog";
import TermFormDialog from "./term-form-dialog";
import { setActiveYearAction, setActiveTermAction, deleteTermAction } from "@/features/settings/actions";
import type { AcademicYearSetting, TermSetting, TermStatus } from "../types";

const statusLabel: Record<TermStatus, string> = { UPCOMING: "รอเปิดเทอม", ACTIVE: "กำลังเรียน", CLOSED: "ปิดแล้ว" };
const statusStyle: Record<TermStatus, { bg: string; fg: string }> = {
  UPCOMING: { bg: "var(--brand-soft)", fg: "var(--brand-ink)" },
  ACTIVE: { bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
  CLOSED: { bg: "var(--surface-sunken)", fg: "var(--muted)" },
};

function formatDate(iso: string): string {
  return iso || "—";
}

export default function AcademicSettings({ years }: { years: AcademicYearSetting[] }): React.ReactNode {
  const [, startAction] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  const [yearDialog, setYearDialog] = useState<{ open: boolean; year: AcademicYearSetting | null }>({ open: false, year: null });
  const [termDialog, setTermDialog] = useState<{ open: boolean; yearId: string; term: TermSetting | null; suggested: number }>({
    open: false,
    yearId: "",
    term: null,
    suggested: 1,
  });
  const [deletingTerm, setDeletingTerm] = useState<TermSetting | null>(null);
  const [isDeletePending, startDelete] = useTransition();

  function notify(result: { ok: boolean; message?: string }): void {
    setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "สำเร็จ" : "ไม่สำเร็จ") });
  }

  function activateYear(id: string): void {
    startAction(async () => notify(await setActiveYearAction(id)));
  }

  function activateTerm(id: string): void {
    startAction(async () => notify(await setActiveTermAction(id)));
  }

  function confirmDeleteTerm(): void {
    if (!deletingTerm) return;
    startDelete(async () => {
      const result = await deleteTermAction(deletingTerm.id);
      notify(result);
      setDeletingTerm(null);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[13.5px] text-muted">
          กำหนดปีการศึกษาและภาคเรียน ข้อมูลทั้งระบบ (นักเรียน รายวิชา ตารางสอน การเช็คชื่อ) จะอ้างอิงภาคเรียนที่ตั้งเป็น “ปัจจุบัน”
        </p>
        <Button variant="contained" startIcon={<Icon name="add" sx={{ fontSize: 18 }} />} onClick={() => setYearDialog({ open: true, year: null })}>
          เพิ่มปีการศึกษา
        </Button>
      </div>

      {years.length === 0 && (
        <div className="rounded-[16px] px-6 py-14 text-center" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}>
          <p className="text-[15px] font-semibold text-ink-strong">ยังไม่มีปีการศึกษา</p>
          <p className="mt-1 text-[13.5px] text-muted">เริ่มด้วยการเพิ่มปีการศึกษาแรก</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {years.map((year) => (
          <section key={year.id} className="overflow-hidden rounded-[16px]" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4" style={{ borderBottom: "1px solid var(--line)", background: year.isActive ? "var(--brand-softer)" : "transparent" }}>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-[10px]" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
                  <Icon name="calendar" sx={{ fontSize: 19 }} />
                </span>
                <div>
                  <h3 className="text-[16px] font-bold text-ink-strong">ปีการศึกษา {year.buddhistYear}</h3>
                  <p className="tabular text-[12px] text-muted">
                    {formatDate(year.startDate)} – {formatDate(year.endDate)} · {year.terms.length} ภาคเรียน
                  </p>
                </div>
              </div>

              {year.isActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: "var(--brand)", color: "var(--on-primary)" }}>
                  <Icon name="success" sx={{ fontSize: 14 }} />
                  ปีปัจจุบัน
                </span>
              ) : (
                <button type="button" onClick={() => activateYear(year.id)} className="rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors hover:bg-surface-2" style={{ color: "var(--brand-ink)", border: "1px solid var(--line-strong)" }}>
                  ตั้งเป็นปีปัจจุบัน
                </button>
              )}

              <div className="ml-auto flex items-center gap-1">
                <Tooltip title="แก้ไขปีการศึกษา" arrow>
                  <IconButton size="small" aria-label={`แก้ไขปีการศึกษา ${year.buddhistYear}`} onClick={() => setYearDialog({ open: true, year })}>
                    <Icon name="edit" sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-3">
              {year.terms.length === 0 && <p className="px-2 py-3 text-[13px] text-faint">ยังไม่มีภาคเรียน — กด “เพิ่มภาคเรียน” เพื่อเริ่ม</p>}
              {year.terms.map((term) => (
                <div key={term.id} className="flex flex-col gap-3 rounded-[12px] p-3 sm:flex-row sm:items-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--line)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-ink-strong">{term.name}</p>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: statusStyle[term.status].bg, color: statusStyle[term.status].fg }}>
                        {statusLabel[term.status]}
                      </span>
                      {term.isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: "var(--brand)", color: "var(--on-primary)" }}>
                          <Icon name="success" sx={{ fontSize: 12 }} />
                          ปัจจุบัน
                        </span>
                      )}
                    </div>
                    <p className="tabular mt-0.5 text-[12.5px] text-muted">
                      {formatDate(term.startDate)} – {formatDate(term.endDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {!term.isActive && (
                      <Button size="small" variant="outlined" onClick={() => activateTerm(term.id)}>
                        ตั้งเป็นปัจจุบัน
                      </Button>
                    )}
                    <Tooltip title="แก้ไขภาคเรียน" arrow>
                      <IconButton size="small" aria-label={`แก้ไข ${term.name}`} onClick={() => setTermDialog({ open: true, yearId: year.id, term, suggested: term.number })}>
                        <Icon name="edit" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบภาคเรียน" arrow>
                      <IconButton size="small" aria-label={`ลบ ${term.name}`} onClick={() => setDeletingTerm(term)}>
                        <Icon name="delete" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setTermDialog({ open: true, yearId: year.id, term: null, suggested: year.terms.length + 1 })}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[13px] font-semibold transition-colors hover:bg-surface-2"
                style={{ border: "1px dashed var(--line-strong)", color: "var(--brand-ink)" }}
              >
                <Icon name="add" sx={{ fontSize: 17 }} />
                เพิ่มภาคเรียน
              </button>
            </div>
          </section>
        ))}
      </div>

      <YearFormDialog
        open={yearDialog.open}
        year={yearDialog.year}
        onClose={() => setYearDialog({ open: false, year: null })}
        onSaved={() => {
          setYearDialog({ open: false, year: null });
          setToast({ severity: "success", message: "บันทึกปีการศึกษาเรียบร้อย" });
        }}
      />

      <TermFormDialog
        open={termDialog.open}
        academicYearId={termDialog.yearId}
        term={termDialog.term}
        suggestedNumber={termDialog.suggested}
        onClose={() => setTermDialog((d) => ({ ...d, open: false }))}
        onSaved={() => {
          setTermDialog((d) => ({ ...d, open: false }));
          setToast({ severity: "success", message: "บันทึกภาคเรียนเรียบร้อย" });
        }}
      />

      <ConfirmDialog
        open={deletingTerm !== null}
        title="ลบภาคเรียน"
        message={deletingTerm ? `ต้องการลบ “${deletingTerm.name}” ใช่หรือไม่? ข้อมูลจะถูกซ่อนแต่ยังเก็บประวัติไว้` : ""}
        confirmLabel="ลบภาคเรียน"
        destructive
        pending={isDeletePending}
        onConfirm={confirmDeleteTerm}
        onClose={() => setDeletingTerm(null)}
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
