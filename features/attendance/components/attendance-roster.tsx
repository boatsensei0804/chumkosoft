"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Icon from "@/features/dashboard/components/icon";
import { saveAttendanceAction } from "@/features/attendance/actions";
import { ATTENDANCE_STATUSES, ATTENDANCE_LABELS } from "@/features/attendance/types";
import type { AttendanceRoster as Roster, AttendanceStatusKey, RosterStudent } from "@/features/attendance/types";

const STATUS_TINT: Record<AttendanceStatusKey, { bg: string; fg: string }> = {
  PRESENT: { bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
  ABSENT: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  LATE: { bg: "var(--warning-soft)", fg: "oklch(0.5 0.12 55)" },
  LEAVE: { bg: "var(--surface-sunken)", fg: "var(--muted)" },
  EXCUSED: { bg: "var(--brand-soft)", fg: "var(--brand-ink)" },
};

export default function AttendanceRoster({ roster }: { roster: Roster }): React.ReactNode {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatusKey>>(() =>
    Object.fromEntries(roster.students.map((s) => [s.studentId, s.status])),
  );
  const [isSaving, startSave] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

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
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ") });
      if (result.ok) router.refresh();
    });
  }

  if (roster.students.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-[16px] px-6 py-16 text-center"
        style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}
      >
        <span className="grid size-12 place-items-center rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }} aria-hidden="true">
          <Icon name="groups" sx={{ fontSize: 24 }} />
        </span>
        <p className="text-[15px] font-semibold text-ink-strong">ไม่มีนักเรียนในชั้นเรียนนี้</p>
        <p className="text-[13.5px] text-muted">ยังไม่มีนักเรียนลงทะเบียนในชั้นเรียนของรายวิชานี้ในภาคเรียนปัจจุบัน</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!roster.meetsOnDay && (
        <Alert severity="info" sx={{ borderRadius: "var(--radius-sm)" }}>
          รายวิชานี้ไม่มีคาบเรียนในวันที่เลือก แต่ยังบันทึกการเช็คชื่อได้{roster.periodLabel ? ` (คาบ: ${roster.periodLabel})` : ""}
        </Alert>
      )}

      <div
        className="flex flex-col gap-3 overflow-hidden rounded-[16px]"
        style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            {ATTENDANCE_STATUSES.map((st) => (
              <span
                key={st}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
                style={{ backgroundColor: STATUS_TINT[st].bg, color: STATUS_TINT[st].fg }}
              >
                {ATTENDANCE_LABELS[st]}
                <span className="tabular">{counts[st]}</span>
              </span>
            ))}
          </div>
          <Button variant="text" onClick={markAllPresent} startIcon={<Icon name="check" sx={{ fontSize: 18 }} />}>
            ทำเครื่องหมายมาทั้งหมด
          </Button>
        </div>

        <ul className="flex flex-col">
          {roster.students.map((s) => (
            <RosterRow key={s.studentId} student={s} status={statuses[s.studentId]} onChange={setStatus} />
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2 p-4" style={{ borderTop: "1px solid var(--line)", backgroundColor: "var(--surface)" }}>
          <Button variant="contained" onClick={save} disabled={isSaving || !roster.schedulable} startIcon={<Icon name="check" sx={{ fontSize: 18 }} />}>
            {isSaving ? "กำลังบันทึก…" : "บันทึกการเช็คชื่อ"}
          </Button>
        </div>
      </div>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: "var(--radius-sm)" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
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
    <li
      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-3">
        <Avatar sx={{ width: 34, height: 34, bgcolor: "var(--brand-soft)", color: "var(--brand-ink)", fontSize: 13 }}>
          {student.name.charAt(0)}
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink-strong">{student.name}</p>
          <p className="tabular text-[12px] text-muted">รหัส {student.code}</p>
        </div>
      </div>

      <div role="radiogroup" aria-label={`สถานะของ ${student.name}`} className="flex flex-wrap gap-1">
        {ATTENDANCE_STATUSES.map((st) => {
          const active = status === st;
          const tint = STATUS_TINT[st];
          return (
            <button
              key={st}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(student.studentId, st)}
              className="rounded-[8px] px-3 py-1.5 text-[13px] font-semibold transition-colors"
              style={{
                backgroundColor: active ? tint.bg : "var(--surface-2)",
                color: active ? tint.fg : "var(--muted)",
                border: active ? `1px solid ${tint.fg}` : "1px solid transparent",
              }}
            >
              {ATTENDANCE_LABELS[st]}
            </button>
          );
        })}
      </div>
    </li>
  );
}
