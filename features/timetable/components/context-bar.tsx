"use client";

import { CalendarDays, CheckCircle2 } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type { ContextOption } from "../types";

interface ContextBarProps {
  terms: ContextOption[];
  termId: string;
  onTermChange: (v: string) => void;
  classrooms: ContextOption[];
  classroomId: string;
  onClassroomChange: (v: string) => void;
  placed: number;
  total: number;
  showClassroom?: boolean;
}

export default function ContextBar({
  terms,
  termId,
  onTermChange,
  classrooms,
  classroomId,
  onClassroomChange,
  placed,
  total,
  showClassroom = true,
}: ContextBarProps): React.ReactNode {
  const complete = total > 0 && placed >= total;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-muted">ภาคเรียน</span>
        <NativeSelect
          value={terms.some((t) => t.id === termId) ? termId : ""}
          onChange={(e) => onTermChange(e.target.value)}
          disabled={terms.length === 0}
          className="min-w-[150px] bg-card font-semibold"
          aria-label="เลือกภาคเรียน"
        >
          {terms.length === 0 && <option value="">— ไม่มีภาคเรียน —</option>}
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
      </label>
      {showClassroom && <label className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-muted">ชั้นเรียน</span>
        <NativeSelect
          value={classrooms.some((c) => c.id === classroomId) ? classroomId : ""}
          onChange={(e) => onClassroomChange(e.target.value)}
          disabled={classrooms.length === 0}
          className="min-w-[150px] bg-card font-semibold"
          aria-label="เลือกชั้นเรียน"
        >
          {classrooms.length === 0 && <option value="">— ไม่มีห้องเรียน —</option>}
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </label>}

      <div className="ml-auto flex items-center gap-2">
        <span
          className={cn(
            "tabular inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold",
            complete ? "bg-success-soft text-[oklch(0.42_0.1_152)]" : "bg-brand-soft text-brand-ink",
          )}
        >
          {complete ? <CheckCircle2 className="size-4" /> : <CalendarDays className="size-4" />}
          จัดแล้ว {placed}/{total} คาบ
        </span>
      </div>
    </div>
  );
}
