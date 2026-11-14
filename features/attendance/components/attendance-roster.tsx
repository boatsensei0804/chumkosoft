"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Users, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { saveAttendanceAction } from "@/features/attendance/actions";
import { ATTENDANCE_STATUSES, ATTENDANCE_LABELS } from "@/features/attendance/types";
import type { AttendanceRoster as Roster, AttendanceStatusKey, RosterStudent } from "@/features/attendance/types";

const STATUS_TINT: Record<AttendanceStatusKey, string> = {
  PRESENT: "bg-success-soft text-[oklch(0.42_0.1_152)]",
  ABSENT: "bg-danger-soft text-danger",
  LATE: "bg-warning-soft text-[oklch(0.5_0.12_55)]",
  LEAVE: "bg-surface-sunken text-muted",
  EXCUSED: "bg-brand-soft text-brand-ink",
};
const STATUS_ACTIVE_RING: Record<AttendanceStatusKey, string> = {
  PRESENT: "ring-[oklch(0.42_0.1_152)]",
  ABSENT: "ring-danger",
  LATE: "ring-[oklch(0.5_0.12_55)]",
  LEAVE: "ring-muted",
  EXCUSED: "ring-brand-ink",
};

export default function AttendanceRoster({ roster }: { roster: Roster }): React.ReactNode {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatusKey>>(() =>
    Object.fromEntries(roster.students.map((s) => [s.studentId, s.status])),
  );
  const [isSaving, startSave] = useTransition();

  const counts = useMemo(() => {
    const acc: Record<AttendanceStatusKey, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0, EXCUSED: 0 };
    for (const s of roster.students) acc[statuses[s.studentId]] += 1;
    return acc;
  }, [statuses, roster.students]);

  function setStatus(studentId: string, status: AttendanceStatusKey): void {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAllPresent(): void {
    setStatuses(Object.fromEntries(roster.students.map((s) => [s.studentId, "PRESENT" as AttendanceStatusKey])));
  }

  function save(): void {
    startSave(async () => {
      const entries = roster.students.map((s) => ({ studentId: s.studentId, status: statuses[s.studentId], note: null }));
      const result = await saveAttendanceAction(roster.offeringId, roster.date, entries);
      if (result.ok) {
        toast.success(result.message ?? "บันทึกแล้ว");
        router.refresh();
      } else {
        toast.error(result.message ?? "บันทึกไม่สำเร็จ");
      }
    });
  }

  if (roster.students.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
          <Users className="size-6" />
        </span>
        <p className="text-[15px] font-semibold text-ink-strong">ไม่มีนักเรียนในชั้นเรียนนี้</p>
        <p className="text-[13.5px] text-muted">ยังไม่มีนักเรียนลงทะเบียนในชั้นเรียนของรายวิชานี้ในภาคเรียนปัจจุบัน</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!roster.meetsOnDay && (
        <p className="flex items-start gap-2.5 rounded-[12px] border border-brand-soft bg-brand-softer px-4 py-3 text-[13px] leading-relaxed text-ink">
          <Info className="mt-0.5 size-[18px] shrink-0 text-brand-ink" />
          รายวิชานี้ไม่มีคาบเรียนในวันที่เลือก แต่ยังบันทึกการเช็คชื่อได้{roster.periodLabel ? ` (คาบ: ${roster.periodLabel})` : ""}
        </p>
      )}

      <div className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            {ATTENDANCE_STATUSES.map((st) => (
              <span key={st} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold", STATUS_TINT[st])}>
                {ATTENDANCE_LABELS[st]}
                <span className="tabular">{counts[st]}</span>
              </span>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={markAllPresent} className="text-brand-ink">
            <Check className="size-4" /> ทำเครื่องหมายมาทั้งหมด
          </Button>
        </div>

        <ul className="flex flex-col">
          {roster.students.map((s) => (
            <RosterRow key={s.studentId} student={s} status={statuses[s.studentId]} onChange={setStatus} />
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2 border-t border-line bg-surface p-4">
          <Button onClick={save} disabled={isSaving || !roster.schedulable}>
            <Check className="size-4" /> {isSaving ? "กำลังบันทึก…" : "บันทึกการเช็คชื่อ"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RosterRow({
  student,
  status,
  onChange,
}: {
  student: RosterStudent;
  status: AttendanceStatusKey;
  onChange: (studentId: string, status: AttendanceStatusKey) => void;
}): React.ReactNode {
  return (
    <li className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="size-[34px]">
          <AvatarFallback className="bg-brand-soft text-[13px] font-semibold text-brand-ink">{student.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink-strong">{student.name}</p>
          <p className="tabular text-[12px] text-muted">รหัส {student.code}</p>
        </div>
      </div>

      <div role="radiogroup" aria-label={`สถานะของ ${student.name}`} className="flex flex-wrap gap-1">
        {ATTENDANCE_STATUSES.map((st) => {
          const active = status === st;
          return (
            <button
              key={st}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(student.studentId, st)}
              className={cn(
                "min-h-10 rounded-[8px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
                active ? cn(STATUS_TINT[st], "ring-1", STATUS_ACTIVE_RING[st]) : "bg-surface-2 text-muted hover:text-ink",
              )}
            >
              {ATTENDANCE_LABELS[st]}
            </button>
          );
        })}
      </div>
    </li>
  );
}
