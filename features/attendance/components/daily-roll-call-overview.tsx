import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DailyClassSummary } from "@/features/attendance/types";
import MascotEmptyState from "@/components/ui/mascot-empty-state";
import MobileRecordCard from "@/features/dashboard/components/mobile-record-card";

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
  return (
    <div className="flex flex-col gap-4">
      {rooms.length === 0 ? (
        <MascotEmptyState title="ยังไม่มีห้องเรียนที่มีนักเรียนในภาคเรียนนี้" description="ลงทะเบียนนักเรียนและจัดห้องเรียนก่อนเริ่มเช็กชื่อ" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-ink-strong">สรุปแยกตามห้องเรียน</h3>
            <p className="mt-0.5 text-xs text-muted">เปอร์เซ็นต์คำนวณจากจำนวนนักเรียนทั้งหมดของแต่ละห้อง</p>
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {rooms.map((room) => <MobileRecordCard key={room.classroomId} title={`ห้อง ${room.classroomCode}`} subtitle={room.gradeLevel}
              fields={[{ label: "นักเรียน", value: `${room.total} คน` }, { label: "มาเรียน", value: stat(room.present, room.total) }, { label: "มาสาย", value: stat(room.late, room.total) }, { label: "ยังไม่เช็ค", value: stat(room.unchecked, room.total) }]}
              actions={<Link href={`/dashboard/attendance?mode=homeroom&date=${date}&classroom=${room.classroomId}`} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-line px-3 text-sm font-semibold text-brand-ink">ดูรายชื่อ <ArrowRight className="size-4" /></Link>}
            />)}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
