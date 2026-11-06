import Link from "next/link";
import { ArrowRight, Check, Clock3, CircleDashed, Users, type LucideIcon } from "lucide-react";
import type { DailyClassSummary } from "@/features/attendance/types";

function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function stat(count: number, total: number): string {
  return `${count.toLocaleString("th-TH")} คน · ${percent(count, total)}%`;
}

export default function DailyRollCallOverview({ date, rooms }: { date: string; rooms: DailyClassSummary[] }): React.ReactNode {
  const all = rooms.reduce(
    (result, room) => ({
      total: result.total + room.total,
      present: result.present + room.present,
      late: result.late + room.late,
      unchecked: result.unchecked + room.unchecked,
    }),
    { total: 0, present: 0, late: 0, unchecked: 0 },
  );
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">ภาพรวมรายวัน</p>
          <h2 className="mt-1 text-lg font-semibold text-ink-strong">{dateLabel}</h2>
        </div>
        <Link href={`/dashboard/attendance?mode=homeroom&date=${date}&month=${date.slice(0, 7)}`} className="text-sm font-medium text-brand-ink hover:underline">กลับไปปฏิทิน</Link>
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-line bg-bg sm:grid-cols-3">
        <Summary icon={Check} label="มาเรียน" value={stat(all.present, all.total)} color="text-success" />
        <Summary icon={Clock3} label="มาสาย" value={stat(all.late, all.total)} color="text-warning" />
        <Summary icon={CircleDashed} label="ยังไม่เช็คชื่อ" value={stat(all.unchecked, all.total)} color="text-muted" />
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg px-6 py-12 text-center">
          <Users className="mx-auto size-8 text-faint" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-ink-strong">ยังไม่มีห้องเรียนที่มีนักเรียนในภาคเรียนนี้</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-ink-strong">สรุปแยกตามห้องเรียน</h3>
            <p className="mt-0.5 text-xs text-muted">เปอร์เซ็นต์คำนวณจากจำนวนนักเรียนทั้งหมดของแต่ละห้อง</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold text-muted">
                  <th className="px-4 py-3">ห้องเรียน</th>
                  <th className="px-4 py-3 text-right">นักเรียน</th>
                  <th className="px-4 py-3 text-right">มาเรียน</th>
                  <th className="px-4 py-3 text-right">มาสาย</th>
                  <th className="px-4 py-3 text-right">ยังไม่เช็ค</th>
                  <th className="px-4 py-3 text-right">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.classroomId} className="border-b border-line last:border-0 hover:bg-brand-softer">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink-strong">{room.classroomCode}</p>
                      <p className="mt-0.5 text-xs text-muted">{room.gradeLevel}</p>
                    </td>
                    <td className="tabular px-4 py-3.5 text-right text-ink">{room.total.toLocaleString("th-TH")} คน</td>
                    <td className="tabular px-4 py-3.5 text-right font-medium text-success">{stat(room.present, room.total)}</td>
                    <td className="tabular px-4 py-3.5 text-right font-medium text-warning">{stat(room.late, room.total)}</td>
                    <td className="tabular px-4 py-3.5 text-right text-muted">{stat(room.unchecked, room.total)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/dashboard/attendance?mode=homeroom&date=${date}&classroom=${room.classroomId}`}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-soft"
                      >
                        ดูรายชื่อ <ArrowRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-surface text-xs font-semibold text-ink-strong">
                  <td className="px-4 py-3">รวม</td>
                  <td className="tabular px-4 py-3 text-right">{all.total.toLocaleString("th-TH")} คน</td>
                  <td className="tabular px-4 py-3 text-right text-success">{stat(all.present, all.total)}</td>
                  <td className="tabular px-4 py-3 text-right text-warning">{stat(all.late, all.total)}</td>
                  <td className="tabular px-4 py-3 text-right text-muted">{stat(all.unchecked, all.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}): React.ReactNode {
  return (
    <div className="flex items-center gap-3 border-b border-line p-4 last:border-0 sm:border-b-0 sm:border-r sm:p-5">
      <span className={`grid size-9 place-items-center rounded-lg bg-surface-2 ${color}`} aria-hidden="true"><Icon className="size-[18px]" /></span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 tabular text-sm font-semibold text-ink-strong">{value}</p>
      </div>
    </div>
  );
}
