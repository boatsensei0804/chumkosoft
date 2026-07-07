"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LinearProgress from "@mui/material/LinearProgress";
import Button from "@mui/material/Button";
import Icon from "@/features/dashboard/components/icon";
import type { ClassroomFaceProgress } from "../types";

function percent(enrolled: number, total: number): number {
  return total === 0 ? 0 : Math.round((enrolled / total) * 100);
}

function barColor(pct: number): string {
  if (pct >= 100) return "oklch(0.55 0.13 152)";
  if (pct >= 50) return "var(--brand)";
  return "oklch(0.62 0.16 55)";
}

export default function FacesRoomOverview({ rooms }: { rooms: ClassroomFaceProgress[] }): React.ReactNode {
  const [expanded, setExpanded] = useState<string | null>(null);

  const totals = useMemo(() => {
    return rooms.reduce(
      (acc, r) => ({ total: acc.total + r.total, enrolled: acc.enrolled + r.enrolled }),
      { total: 0, enrolled: 0 },
    );
  }, [rooms]);

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[16px] px-6 py-16 text-center" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}>
        <span className="grid size-12 place-items-center rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }} aria-hidden="true">
          <Icon name="groups" sx={{ fontSize: 24 }} />
        </span>
        <p className="text-[15px] font-semibold text-ink-strong">ยังไม่มีข้อมูลชั้นเรียน</p>
        <p className="max-w-sm text-[13.5px] text-muted">ยังไม่มีนักเรียนลงทะเบียนในภาคเรียนปัจจุบัน ตั้งค่าปีการศึกษา/ภาคเรียนและลงทะเบียนนักเรียนก่อน</p>
      </div>
    );
  }

  const overall = percent(totals.enrolled, totals.total);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[16px] p-5" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
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
        <LinearProgress
          variant="determinate"
          value={overall}
          sx={{ mt: 2, height: 8, "& .MuiLinearProgress-bar": { backgroundColor: barColor(overall) } }}
        />
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rooms.map((room) => {
          const pct = percent(room.enrolled, room.total);
          const isOpen = expanded === room.classroomId;
          return (
            <li key={room.classroomId} className="overflow-hidden rounded-[16px]" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : room.classroomId)}
                aria-expanded={isOpen}
                className="flex w-full flex-col gap-2.5 p-4 text-left transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-[10px]" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
                      <Icon name="groups" sx={{ fontSize: 19 }} />
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
                    <span className="tabular rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ backgroundColor: "var(--surface-sunken)", color: barColor(pct) }}>
                      {pct}%
                    </span>
                    <Icon name="chevron_down" sx={{ fontSize: 20, color: "var(--faint)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }} />
                  </div>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{ height: 7, "& .MuiLinearProgress-bar": { backgroundColor: barColor(pct) } }}
                />
              </button>

              {isOpen && (
                <ul className="flex flex-col" style={{ borderTop: "1px solid var(--line)" }}>
                  {room.members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ borderBottom: "1px solid var(--line)" }}>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-ink-strong">{m.name}</p>
                        <p className="tabular text-[12px] text-muted">รหัส {m.code}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {m.templateCount > 0 ? (
                          <span className="tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: "var(--success-soft)", color: "oklch(0.42 0.1 152)" }}>
                            <Icon name="success" sx={{ fontSize: 13 }} />
                            {m.templateCount} รูป
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: "var(--surface-sunken)", color: "var(--faint)" }}>
                            ยังไม่มี
                          </span>
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
    <Button
      size="small"
      variant={hasPhotos ? "text" : "outlined"}
      onClick={() => router.push(`/dashboard/faces?view=students&student=${studentId}`)}
    >
      {hasPhotos ? "จัดการ" : "เพิ่มรูป"}
    </Button>
  );
}
