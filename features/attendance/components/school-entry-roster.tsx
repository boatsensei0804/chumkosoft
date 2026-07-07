"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Icon from "@/features/dashboard/components/icon";
import { checkInAction, checkOutAction } from "@/features/attendance/school-entry-actions";
import type { SchoolEntryRoster as Roster, SchoolEntryState, SchoolEntryStudent } from "@/features/attendance/types";

const STATE_META: Record<SchoolEntryState, { label: string; bg: string; fg: string }> = {
  ABSENT: { label: "ยังไม่มา", bg: "var(--surface-sunken)", fg: "var(--muted)" },
  IN: { label: "อยู่ในโรงเรียน", bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
  OUT: { label: "กลับแล้ว", bg: "var(--brand-soft)", fg: "var(--brand-ink)" },
};

export default function SchoolEntryRoster({ roster }: { roster: Roster }): React.ReactNode {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startAction] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

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
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "บันทึกแล้ว" : "ไม่สำเร็จ") });
      setPendingId(null);
      if (result.ok) router.refresh();
    });
  }

  if (roster.students.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[16px] px-6 py-16 text-center" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}>
        <span className="grid size-12 place-items-center rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }} aria-hidden="true">
          <Icon name="groups" sx={{ fontSize: 24 }} />
        </span>
        <p className="text-[15px] font-semibold text-ink-strong">ไม่มีนักเรียนให้แสดง</p>
        <p className="text-[13.5px] text-muted">ยังไม่มีนักเรียนลงทะเบียนในภาคเรียนปัจจุบัน หรือในชั้นเรียนที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold" style={{ backgroundColor: "var(--success-soft)", color: "oklch(0.42 0.1 152)" }}>
          มาแล้ว <span className="tabular">{counts.present}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold" style={{ backgroundColor: "var(--surface-sunken)", color: "var(--muted)" }}>
          ยังไม่มา <span className="tabular">{counts.absent}</span>
        </span>
      </div>

      <div className="overflow-hidden rounded-[16px]" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
        <ul className="flex flex-col">
          {roster.students.map((s) => (
            <EntryRow key={s.studentId} student={s} pending={pendingId === s.studentId} onCheckIn={() => run(s.studentId, checkInAction)} onCheckOut={() => run(s.studentId, checkOutAction)} />
          ))}
        </ul>
      </div>

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
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
      <div className="flex items-center gap-3">
        <Avatar sx={{ width: 34, height: 34, bgcolor: "var(--brand-soft)", color: "var(--brand-ink)", fontSize: 13 }}>{student.name.charAt(0)}</Avatar>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink-strong">{student.name}</p>
          <p className="tabular text-[12px] text-muted">
            รหัส {student.code} · {student.classroomCode}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.fg }}>
          {meta.label}
        </span>
        {student.isLate && student.state !== "ABSENT" && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: "var(--warning-soft)", color: "oklch(0.5 0.12 55)" }}>
            มาสาย
          </span>
        )}
        {student.checkInAt && (
          <span className="tabular text-[12.5px] text-muted">
            เข้า {student.checkInAt}
            {student.checkOutAt ? ` · ออก ${student.checkOutAt}` : ""}
          </span>
        )}

        {student.state === "ABSENT" && (
          <Button size="small" variant="contained" disabled={pending} onClick={onCheckIn} startIcon={<Icon name="check" sx={{ fontSize: 16 }} />}>
            บันทึกเข้า
          </Button>
        )}
        {student.state === "IN" && (
          <Button size="small" variant="outlined" disabled={pending} onClick={onCheckOut} startIcon={<Icon name="logout" sx={{ fontSize: 16 }} />}>
            บันทึกออก
          </Button>
        )}
      </div>
    </li>
  );
}
