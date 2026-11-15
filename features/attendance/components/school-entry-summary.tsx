import Link from "next/link";
import type { SchoolEntryRoster } from "@/features/attendance/types";

/** Daily gate overview, using the same advisor-scoped roster as the detail view. */
export default function SchoolEntrySummary({ roster, classrooms }: {
  roster: SchoolEntryRoster;
  classrooms: { id: string; code: string }[];
}): React.ReactNode {
  const rooms = classrooms.map((room) => {
    const students = roster.students.filter((student) => student.classroomCode === room.code);
    const arrived = students.filter((student) => student.state !== "ABSENT");
    return {
      ...room,
      total: students.length,
      present: arrived.length,
      late: arrived.filter((student) => student.isLate).length,
      awaiting: students.filter((student) => student.state === "ABSENT"),
    };
  });

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5" aria-label="สรุปการเข้าโรงเรียน">
      <div className="mb-3"><h2 className="text-sm font-bold text-ink-strong">สรุปแยกตามห้องเรียน</h2><p className="mt-1 text-xs text-muted">ข้อมูลจากจุดสแกนและรายการที่ครูบันทึก ณ เวลาที่เปิดหน้านี้</p></div>
      {rooms.length > 0 && <div className="grid gap-2 lg:grid-cols-2">
        {rooms.map((room) => (
          <article key={room.id} className="rounded-xl border border-line p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink-strong">ห้อง {room.code}</h3>
                <p className="mt-1 text-sm text-muted">มาแล้ว {room.present}/{room.total} คน · {room.total ? Math.round(room.present / room.total * 100) : 0}% · สาย {room.late} · ยังไม่เข้า {room.awaiting.length}</p>
              </div>
              <Link className="shrink-0 text-sm font-semibold text-brand-ink hover:underline" href={`/dashboard/attendance?mode=school&date=${roster.date}&classroom=${encodeURIComponent(room.id)}`}>
                ดูรายชื่อ
              </Link>
            </div>
            {room.awaiting.length > 0 && <details className="mt-2 text-xs text-muted"><summary className="min-h-9 cursor-pointer py-2">ดูชื่อที่ยังไม่มีบันทึกเข้า ({room.awaiting.length} คน)</summary><p className="leading-6">{room.awaiting.slice(0, 5).map((student) => student.name).join(", ")}{room.awaiting.length > 5 ? ` และอีก ${room.awaiting.length - 5} คน · เปิดดูรายชื่อทั้งหมดได้จากปุ่มด้านบน` : ""}</p></details>}
          </article>
        ))}
      </div>}
    </section>
  );
}
