"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Search, Trash2, ScanFace, TriangleAlert, CheckCircle2, Info } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import FaceUploader from "./face-uploader";
import { deleteFaceTemplateAction, setFaceConsentAction } from "@/features/faces/actions";
import type { FaceStudentRow, FaceStudentDetail, FaceTemplateView } from "../types";

interface FacesBrowserProps {
  students: FaceStudentRow[];
  selected: FaceStudentDetail | null;
}

function notify(result: { ok: boolean; message?: string }): void {
  if (result.ok) toast.success(result.message ?? "สำเร็จ");
  else toast.error(result.message ?? "ไม่สำเร็จ");
}

export default function FacesBrowser({ students, selected }: FacesBrowserProps): React.ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<FaceTemplateView | null>(null);
  const [isDeletePending, startDelete] = useTransition();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.classroom.toLowerCase().includes(q));
  }, [students, query]);

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteFaceTemplateAction(deleting.id);
      notify({ ok: result.ok, message: result.message ?? (result.ok ? "ลบเรียบร้อย" : "ลบไม่สำเร็จ") });
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
        {/* Student list */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          <div className="border-b border-line p-3">
            <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2">
              <Search className="size-[18px] text-faint" />
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
                    className={cn("flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left transition-colors", active ? "bg-brand-soft" : "hover:bg-surface-2")}
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-brand-soft text-[13px] font-semibold text-brand-ink">{s.name.replace(/^[^ก-๙A-Za-z]*/, "").charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink-strong">{s.name}</span>
                      <span className="tabular block text-[12px] text-muted">
                        {s.code} · {s.classroom}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "tabular shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
                        s.templateCount > 0 ? "bg-success-soft text-[oklch(0.42_0.1_152)]" : "bg-surface-sunken text-faint",
                      )}
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
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-card p-5 shadow-sm">
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
                notify(r);
                if (r.ok) router.refresh();
              }}
            />

            {selected.consent ? (
              <FaceUploader studentId={selected.id} studentName={selected.name} />
            ) : (
              <div className="flex items-center gap-2.5 rounded-[12px] border border-[oklch(0.85_0.09_75)] bg-warning-soft px-4 py-3">
                <TriangleAlert className="size-[18px] shrink-0 text-[oklch(0.5_0.12_55)]" />
                <p className="text-[13px] text-ink">บันทึกความยินยอมของผู้ปกครองก่อน จึงจะเพิ่มรูปใบหน้าได้</p>
              </div>
            )}

            {selected.templates.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {selected.templates.map((t) => (
                  <li key={t.id} className="group relative overflow-hidden rounded-[12px] border border-line bg-surface-2">
                    <Image src={t.imageUrl} alt={`รูปใบหน้าของ ${selected.name} เพิ่มเมื่อ ${t.createdAt}`} width={320} height={320} unoptimized className="aspect-square w-full object-cover" />
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <span className="tabular text-[11.5px] text-muted">{t.createdAt}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-muted hover:text-ink" aria-label={`ลบรูปที่เพิ่มเมื่อ ${t.createdAt}`} onClick={() => setDeleting(t)}>
                            <Trash2 className="size-[17px]" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>ลบรูปนี้</TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
                <ScanFace className="size-8 text-faint" />
                <p className="text-[14px] font-semibold text-ink-strong">ยังไม่มีรูปใบหน้า</p>
                <p className="max-w-xs text-[12.5px] text-muted">เพิ่มรูปเพื่อให้จุดสแกนจดจำนักเรียนคนนี้ได้ อย่าลืมขอความยินยอมจากผู้ปกครองก่อน</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-card px-6 py-20 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
              <ScanFace className="size-6" />
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
      </div>
    </TooltipProvider>
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
    <div className={cn("flex items-center justify-between gap-3 rounded-[12px] border px-4 py-3", consent ? "border-[oklch(0.82_0.1_152)] bg-success-soft" : "border-line bg-surface-2")}>
      <div className="flex items-start gap-2.5">
        {consent ? <CheckCircle2 className="mt-px size-[18px] text-[oklch(0.42_0.1_152)]" /> : <Info className="mt-px size-[18px] text-muted" />}
        <div>
          <p className="text-[13.5px] font-semibold text-ink-strong">ความยินยอมของผู้ปกครอง (PDPA)</p>
          <p className="text-[12.5px] text-muted">
            {consent ? `ได้รับความยินยอมแล้ว${consentAt ? ` เมื่อ ${consentAt}` : ""}` : "ยังไม่ได้บันทึกความยินยอมให้จัดเก็บข้อมูลใบหน้า"}
          </p>
        </div>
      </div>
      <Switch checked={consent} disabled={pending} onCheckedChange={toggle} aria-label="บันทึกความยินยอมของผู้ปกครอง" />
    </div>
  );
}
