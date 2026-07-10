"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { checkInAction, checkOutAction } from "@/features/attendance/school-entry-actions";
import type { SchoolEntryRoster as Roster, SchoolEntryState, SchoolEntryStudent } from "@/features/attendance/types";

const STATE_META: Record<SchoolEntryState, { label: string; className: string }> = {
  ABSENT: { label: "ยังไม่มา", className: "bg-surface-sunken text-muted" },
  IN: { label: "อยู่ในโรงเรียน", className: "bg-success-soft text-[oklch(0.42_0.1_152)]" },
  OUT: { label: "กลับแล้ว", className: "bg-brand-soft text-brand-ink" },
};

export default function SchoolEntryRoster({ roster }: { roster: Roster }): React.ReactNode {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startAction] = useTransition();

  const counts = useMemo(() => {
    const acc = { present: 0, absent: 0 };
    for (const s of roster.students) {
      if (s.state === "ABSENT") acc.absent += 1;
      else acc.present += 1;
    }
    return acc;
  }, [roster.students]);

  function run(studentId: string, action: (id: string, date: string) => Promise<{ ok: boolean; message?: string }>): void {
    setPendingId(studentId);
    startAction(async () => {
      const result = await action(studentId, roster.date);
      if (result.ok) {
        toast.success(result.message ?? "บันทึกแล้ว");
        router.refresh();
      } else {
        toast.error(result.message ?? "ไม่สำเร็จ");
      }
      setPendingId(null);
    });
  }

  if (roster.students.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
          <Users className="size-6" />
        </span>
        <p className="text-[15px] font-semibold text-ink-strong">ไม่มีนักเรียนให้แสดง</p>
        <p className="text-[13.5px] text-muted">ยังไม่มีนักเรียนลงทะเบียนในภาคเรียนปัจจุบัน หรือในชั้นเรียนที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 font-semibold text-[oklch(0.42_0.1_152)]">
          มาแล้ว <span className="tabular">{counts.present}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 py-1 font-semibold text-muted">
          ยังไม่มา <span className="tabular">{counts.absent}</span>
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <ul className="flex flex-col">
          {roster.students.map((s) => (
            <EntryRow key={s.studentId} student={s} pending={pendingId === s.studentId} onCheckIn={() => run(s.studentId, checkInAction)} onCheckOut={() => run(s.studentId, checkOutAction)} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function EntryRow({
  student,
  pending,
  onCheckIn,
  onCheckOut,
}: {
  student: SchoolEntryStudent;
  pending: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
}): React.ReactNode {
  const meta = STATE_META[student.state];
  return (
    <li className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="size-[34px]">
          <AvatarFallback className="bg-brand-soft text-[13px] font-semibold text-brand-ink">{student.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink-strong">{student.name}</p>
          <p className="tabular text-[12px] text-muted">
            รหัส {student.code} · {student.classroomCode}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold", meta.className)}>{meta.label}</span>
        {student.isLate && student.state !== "ABSENT" && (
          <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[11.5px] font-semibold text-[oklch(0.5_0.12_55)]">มาสาย</span>
        )}
        {student.checkInAt && (
          <span className="tabular text-[12.5px] text-muted">
            เข้า {student.checkInAt}
            {student.checkOutAt ? ` · ออก ${student.checkOutAt}` : ""}
          </span>
        )}

        {student.state === "ABSENT" && (
          <Button size="sm" disabled={pending} onClick={onCheckIn}>
            <Check className="size-4" /> บันทึกเข้า
          </Button>
        )}
        {student.state === "IN" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={onCheckOut}>
            <LogOut className="size-4" /> บันทึกออก
          </Button>
        )}
      </div>
    </li>
  );
}
