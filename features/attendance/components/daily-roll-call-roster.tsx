"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveDailyRollCallAction } from "@/features/attendance/daily-roll-call-actions";
import {
  DAILY_ROLL_CALL_LABELS,
  DAILY_ROLL_CALL_STATUSES,
  type DailyClassRoster,
  type DailyRollCallStatusKey,
} from "@/features/attendance/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<DailyRollCallStatusKey, { idle: string; active: string }> = {
  PRESENT: { idle: "text-success hover:bg-success-soft", active: "bg-success-soft text-success ring-1 ring-success" },
  LATE: { idle: "text-warning hover:bg-warning-soft", active: "bg-warning-soft text-warning ring-1 ring-warning" },
  ABSENT: { idle: "text-danger hover:bg-danger-soft", active: "bg-danger-soft text-danger ring-1 ring-danger" },
  SICK_LEAVE: { idle: "text-brand-ink hover:bg-brand-soft", active: "bg-brand-soft text-brand-ink ring-1 ring-brand" },
  PERSONAL_LEAVE: { idle: "text-muted hover:bg-surface-2", active: "bg-surface-2 text-ink-strong ring-1 ring-line-strong" },
};

export default function DailyRollCallRoster({ roster }: { roster: DailyClassRoster }): React.ReactNode {
  const rosterKey = `${roster.date}:${roster.classroomId}:${roster.students.map((student) => `${student.studentId}:${student.status ?? "unchecked"}`).join(",")}`;
  return <DailyRollCallRosterEditor key={rosterKey} roster={roster} />;
}

function DailyRollCallRosterEditor({ roster }: { roster: DailyClassRoster }): React.ReactNode {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, DailyRollCallStatusKey | null>>(() =>
    Object.fromEntries(roster.students.map((student) => [student.studentId, student.status])),
  );
  const [isSaving, startSaving] = useTransition();

  const counts = useMemo(() => {
    const result: Record<DailyRollCallStatusKey, number> = { PRESENT: 0, LATE: 0, ABSENT: 0, SICK_LEAVE: 0, PERSONAL_LEAVE: 0 };
    for (const status of Object.values(statuses)) if (status) result[status] += 1;
    return { ...result, unchecked: roster.students.length - Object.values(statuses).filter(Boolean).length };
  }, [roster.students.length, statuses]);

  function markEveryonePresent(): void {
    setStatuses(Object.fromEntries(roster.students.map((student) => [student.studentId, "PRESENT" as const])));
  }

  function save(): void {
    const entries = roster.students.flatMap((student) => {
      const status = statuses[student.studentId];
      return status ? [{ studentId: student.studentId, status }] : [];
    });
    if (entries.length === 0) {
      toast.error("เลือกสถานะนักเรียนก่อนบันทึก");
      return;
    }
    startSaving(async () => {
      const result = await saveDailyRollCallAction(roster.date, roster.classroomId, entries);
      if (result.ok) {
        toast.success(result.message ?? "บันทึกแล้ว");
        router.refresh();
      } else {
        toast.error(result.message ?? "บันทึกไม่สำเร็จ");
      }
    });
  }

  const dateLabel = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${roster.date}T00:00:00.000Z`));

  if (roster.students.length === 0) {
    return <div className="rounded-xl border border-line bg-bg px-6 py-12 text-center text-sm text-muted">ห้องนี้ยังไม่มีรายชื่อนักเรียนในภาคเรียนปัจจุบัน</div>;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-xs text-muted">{dateLabel}</p>
          <h2 className="mt-0.5 text-base font-semibold text-ink-strong">ห้อง {roster.classroomCode}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/attendance?mode=homeroom&date=${roster.date}`)}>
            <ArrowLeft className="size-4" /> ภาพรวมห้อง
          </Button>
          <Button variant="ghost" size="sm" onClick={markEveryonePresent}>
            <Check className="size-4" /> มาทั้งห้อง
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 divide-x divide-y divide-line bg-surface sm:grid-cols-3 lg:grid-cols-6">
        <Count label="นักเรียน" count={roster.students.length} />
        <Count label="มา" count={counts.PRESENT} color="text-success" />
        <Count label="มาสาย" count={counts.LATE} color="text-warning" />
        <Count label="ขาดเรียน" count={counts.ABSENT} color="text-danger" />
        <Count label="ลาป่วย / ลากิจ" count={counts.SICK_LEAVE + counts.PERSONAL_LEAVE} color="text-brand-ink" />
        <Count label="ยังไม่เช็ค" count={counts.unchecked} color="text-muted" />
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {roster.students.map((student, index) => {
          const selected = statuses[student.studentId];
          return <article key={student.studentId} className="rounded-xl border border-line bg-bg p-3">
            <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-ink-strong">{index + 1}. {student.name}</p><p className="text-xs text-muted">รหัส {student.code}</p></div><span className="text-xs font-semibold text-brand-ink">{selected ? DAILY_ROLL_CALL_LABELS[selected] : "ยังไม่เช็ค"}</span></div>
            <div role="group" aria-label={`เลือกสถานะ ${student.name}`} className="mt-3 grid grid-cols-2 gap-1.5">
              {DAILY_ROLL_CALL_STATUSES.map((status) => <button key={status} type="button" aria-pressed={selected === status} disabled={isSaving} onClick={() => setStatuses((previous) => ({ ...previous, [student.studentId]: status }))} className={cn("min-h-10 rounded-lg px-2 text-xs font-semibold transition-colors disabled:opacity-50", selected === status ? STATUS_STYLE[status].active : STATUS_STYLE[status].idle)}>{DAILY_ROLL_CALL_LABELS[status]}</button>)}
            </div>
          </article>;
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[970px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-xs font-semibold text-muted">
              <th className="w-12 px-4 py-3 text-right">ลำดับ</th>
              <th className="px-4 py-3">นักเรียน</th>
              <th className="px-4 py-3">เลือกสถานะ</th>
              <th className="w-32 px-4 py-3 text-center">สถานะปัจจุบัน</th>
            </tr>
          </thead>
          <tbody>
            {roster.students.map((student, index) => {
              const selected = statuses[student.studentId];
              return (
                <tr key={student.studentId} className="border-b border-line last:border-0 hover:bg-brand-softer">
                  <td className="tabular px-4 py-3 text-right text-xs text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-strong">{student.name}</p>
                    <p className="mt-0.5 tabular text-xs text-muted">รหัส {student.code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div role="group" aria-label={`เลือกสถานะ ${student.name}`} className="flex flex-wrap gap-1.5">
                      {DAILY_ROLL_CALL_STATUSES.map((status) => {
                        const active = selected === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            aria-pressed={active}
                            disabled={isSaving}
                            onClick={() => setStatuses((previous) => ({ ...previous, [student.studentId]: status }))}
                            className={cn(
                              "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                              active ? STATUS_STYLE[status].active : STATUS_STYLE[status].idle,
                            )}
                          >
                            {DAILY_ROLL_CALL_LABELS[status]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {selected ? (
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[selected].active)}>{DAILY_ROLL_CALL_LABELS[selected]}</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">ยังไม่เช็ค</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 sm:px-5">
        <p className="text-xs text-muted">ยังไม่เช็ค {counts.unchecked} คน · รายชื่อที่ยังไม่เลือกสถานะจะไม่ถูกบันทึก</p>
        <Button onClick={save} disabled={isSaving || counts.unchecked === roster.students.length}>
          <Save className="size-4" /> {isSaving ? "กำลังบันทึก…" : "บันทึกการเช็คชื่อ"}
        </Button>
      </footer>
    </section>
  );
}

function Count({ label, count, color = "text-ink-strong" }: { label: string; count: number; color?: string }): React.ReactNode {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2.5 sm:px-4">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={cn("tabular text-sm font-semibold", color)}>{count.toLocaleString("th-TH")} คน</span>
    </div>
  );
}
