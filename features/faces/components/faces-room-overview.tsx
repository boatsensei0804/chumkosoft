"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClassroomFaceProgress } from "../types";

function percent(enrolled: number, total: number): number {
  return total === 0 ? 0 : Math.round((enrolled / total) * 100);
}

function barColor(pct: number): string {
  if (pct >= 100) return "oklch(0.55 0.13 152)";
  if (pct >= 50) return "var(--brand)";
  return "oklch(0.62 0.16 55)";
}

/** Determinate progress bar — replaces MUI LinearProgress; colour is data-driven. */
function ProgressBar({ value, className }: { value: number; className?: string }): React.ReactNode {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-surface-sunken", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${value}%`, backgroundColor: barColor(value) }} />
    </div>
  );
}

export default function FacesRoomOverview({ rooms }: { rooms: ClassroomFaceProgress[] }): React.ReactNode {
  const [expanded, setExpanded] = useState<string | null>(null);

  const totals = useMemo(() => {
    return rooms.reduce((acc, r) => ({ total: acc.total + r.total, enrolled: acc.enrolled + r.enrolled }), { total: 0, enrolled: 0 });
  }, [rooms]);

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
          <Users className="size-6" />
        </span>
        <p className="text-[15px] font-semibold text-ink-strong">ยังไม่มีข้อมูลชั้นเรียน</p>
        <p className="max-w-sm text-[13.5px] text-muted">ยังไม่มีนักเรียนลงทะเบียนในภาคเรียนปัจจุบัน ตั้งค่าปีการศึกษา/ภาคเรียนและลงทะเบียนนักเรียนก่อน</p>
      </div>
    );
  }

  const overall = percent(totals.enrolled, totals.total);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-muted">ความคืบหน้าทั้งโรงเรียน</p>
            <p className="tabular mt-0.5 text-[22px] font-bold text-ink-strong">
              {totals.enrolled.toLocaleString("th-TH")}
              <span className="text-[14px] font-semibold text-muted"> / {totals.total.toLocaleString("th-TH")} คน</span>
            </p>
          </div>
          <span className="tabular text-[24px] font-bold" style={{ color: barColor(overall) }}>
            {overall}%
          </span>
        </div>
        <ProgressBar value={overall} className="mt-4 h-2" />
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rooms.map((room) => {
          const pct = percent(room.enrolled, room.total);
          const isOpen = expanded === room.classroomId;
          return (
            <li key={room.classroomId} className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : room.classroomId)}
                aria-expanded={isOpen}
                className="flex w-full flex-col gap-2.5 p-4 text-left transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-[10px] bg-brand-soft text-brand-ink">
                      <Users className="size-[19px]" />
                    </span>
                    <div>
                      <p className="text-[15px] font-bold text-ink-strong">{room.code}</p>
                      <p className="text-[12px] text-muted">{room.gradeLevel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-[13px] font-semibold text-ink">
                      {room.enrolled}/{room.total}
                    </span>
                    <span className="tabular rounded-full bg-surface-sunken px-2 py-0.5 text-[12px] font-bold" style={{ color: barColor(pct) }}>
                      {pct}%
                    </span>
                    <ChevronDown className={cn("size-5 text-faint transition-transform duration-150", isOpen && "rotate-180")} />
                  </div>
                </div>
                <ProgressBar value={pct} className="h-[7px]" />
              </button>

              {isOpen && (
                <ul className="flex flex-col border-t border-line">
                  {room.members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-ink-strong">{m.name}</p>
                        <p className="tabular text-[12px] text-muted">รหัส {m.code}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {m.templateCount > 0 ? (
                          <span className="tabular inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11.5px] font-semibold text-[oklch(0.42_0.1_152)]">
                            <CheckCircle2 className="size-3" />
                            {m.templateCount} รูป
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-surface-sunken px-2 py-0.5 text-[11.5px] font-semibold text-faint">ยังไม่มี</span>
                        )}
                        <RoomMemberAction studentId={m.id} hasPhotos={m.templateCount > 0} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RoomMemberAction({ studentId, hasPhotos }: { studentId: string; hasPhotos: boolean }): React.ReactNode {
  const router = useRouter();
  return (
    <Button size="sm" variant={hasPhotos ? "ghost" : "outline"} onClick={() => router.push(`/dashboard/faces?view=students&student=${studentId}`)}>
      {hasPhotos ? "จัดการ" : "เพิ่มรูป"}
    </Button>
  );
}
