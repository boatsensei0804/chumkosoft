"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import YearFormDialog from "./year-form-dialog";
import TermFormDialog from "./term-form-dialog";
import { setActiveYearAction, setActiveTermAction, deleteTermAction } from "@/features/settings/actions";
import type { AcademicYearSetting, TermSetting, TermStatus } from "../types";

const statusLabel: Record<TermStatus, string> = { UPCOMING: "รอเปิดเทอม", ACTIVE: "กำลังเรียน", CLOSED: "ปิดแล้ว" };
const statusStyle: Record<TermStatus, string> = {
  UPCOMING: "bg-brand-soft text-brand-ink",
  ACTIVE: "bg-success-soft text-[oklch(0.42_0.1_152)]",
  CLOSED: "bg-surface-sunken text-muted",
};

function formatDate(iso: string): string {
  return iso || "—";
}

export default function AcademicSettings({ years }: { years: AcademicYearSetting[] }): React.ReactNode {
  const [, startAction] = useTransition();

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
    if (result.ok) toast.success(result.message ?? "สำเร็จ");
    else toast.error(result.message ?? "ไม่สำเร็จ");
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
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[13.5px] text-muted">
            กำหนดปีการศึกษาและภาคเรียน ข้อมูลทั้งระบบ (นักเรียน รายวิชา ตารางสอน การเช็คชื่อ) จะอ้างอิงภาคเรียนที่ตั้งเป็น “ปัจจุบัน”
          </p>
          <Button onClick={() => setYearDialog({ open: true, year: null })}>
            <Plus className="size-4" /> เพิ่มปีการศึกษา
          </Button>
        </div>

        {years.length === 0 && (
          <div className="rounded-2xl border border-line bg-card px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-ink-strong">ยังไม่มีปีการศึกษา</p>
            <p className="mt-1 text-[13.5px] text-muted">เริ่มด้วยการเพิ่มปีการศึกษาแรก</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {years.map((year) => (
            <section key={year.id} className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
              <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4", year.isActive && "bg-brand-softer")}>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-[10px] bg-brand-soft text-brand-ink">
                    <CalendarDays className="size-[19px]" />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold text-ink-strong">ปีการศึกษา {year.buddhistYear}</h3>
                    <p className="tabular text-[12px] text-muted">
                      {formatDate(year.startDate)} – {formatDate(year.endDate)} · {year.terms.length} ภาคเรียน
                    </p>
                  </div>
                </div>

                {year.isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[12px] font-semibold text-[var(--on-primary)]">
                    <CheckCircle2 className="size-3.5" />
                    ปีปัจจุบัน
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => activateYear(year.id)}
                    className="rounded-full border border-line-strong px-2.5 py-1 text-[12px] font-semibold text-brand-ink transition-colors hover:bg-surface-2"
                  >
                    ตั้งเป็นปีปัจจุบัน
                  </button>
                )}

                <div className="ml-auto flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`แก้ไขปีการศึกษา ${year.buddhistYear}`} onClick={() => setYearDialog({ open: true, year })}>
                        <Pencil className="size-[18px]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>แก้ไขปีการศึกษา</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3">
                {year.terms.length === 0 && <p className="px-2 py-3 text-[13px] text-faint">ยังไม่มีภาคเรียน — กด “เพิ่มภาคเรียน” เพื่อเริ่ม</p>}
                {year.terms.map((term) => (
                  <div key={term.id} className="flex flex-col gap-3 rounded-[12px] border border-line bg-surface p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-semibold text-ink-strong">{term.name}</p>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold", statusStyle[term.status])}>
                          {statusLabel[term.status]}
                        </span>
                        {term.isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[11.5px] font-semibold text-[var(--on-primary)]">
                            <CheckCircle2 className="size-3" />
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
                        <Button size="sm" variant="outline" onClick={() => activateTerm(term.id)}>
                          ตั้งเป็นปัจจุบัน
                        </Button>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`แก้ไข ${term.name}`} onClick={() => setTermDialog({ open: true, yearId: year.id, term, suggested: term.number })}>
                            <Pencil className="size-[18px]" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>แก้ไขภาคเรียน</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`ลบ ${term.name}`} onClick={() => setDeletingTerm(term)}>
                            <Trash2 className="size-[18px]" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>ลบภาคเรียน</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setTermDialog({ open: true, yearId: year.id, term: null, suggested: year.terms.length + 1 })}
                  className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-line-strong py-2.5 text-[13px] font-semibold text-brand-ink transition-colors hover:bg-surface-2"
                >
                  <Plus className="size-[17px]" />
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
            toast.success("บันทึกปีการศึกษาเรียบร้อย");
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
            toast.success("บันทึกภาคเรียนเรียบร้อย");
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
      </div>
    </TooltipProvider>
  );
}
