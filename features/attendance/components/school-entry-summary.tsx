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
  const totals = rooms.reduce((result, room) => ({
    students: result.students + room.total,
    present: result.present + room.present,
    late: result.late + room.late,
    awaiting: result.awaiting + room.awaiting.length,
  }), { students: 0, present: 0, late: 0, awaiting: 0 });

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5" aria-label="สรุปการเข้าโรงเรียน">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink-strong">สรุปการเข้าโรงเรียน · {roster.date}</h2>
        <p className="text-sm text-muted">ข้อมูลจากจุดสแกนและรายการที่ครูบันทึก ณ เวลาที่เปิดหน้านี้</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ["นักเรียนทั้งหมด", totals.students], ["มาแล้ว", totals.present],
          ["มาสาย", totals.late], ["ยังไม่เข้า", totals.awaiting],
        ] as const).map(([title, value]) => (
          <div key={title} className="rounded-xl bg-surface px-3 py-3">
            <p className="text-xs text-muted">{title}</p>
            <p className="mt-1 text-2xl font-bold tabular text-ink-strong">{value.toLocaleString("th-TH")}</p>
          </div>
        ))}
      </div>
      {rooms.length > 0 && <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {rooms.map((room) => (
          <article key={room.id} className="rounded-xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink-strong">ห้อง {room.code}</h3>
                <p className="mt-1 text-sm text-muted">มาแล้ว {room.present}/{room.total} คน · {room.total ? Math.round(room.present / room.total * 100) : 0}% · สาย {room.late} · ยังไม่เข้า {room.awaiting.length}</p>
              </div>
              <Link className="shrink-0 text-sm font-semibold text-brand-ink hover:underline" href={`/dashboard/attendance?mode=school&date=${roster.date}&classroom=${encodeURIComponent(room.id)}`}>
                ดูรายชื่อ
              </Link>
            </div>
            {room.awaiting.length > 0 && <p className="mt-3 text-sm text-muted">ยังไม่เข้า: {room.awaiting.slice(0, 5).map((student) => student.name).join(", ")}{room.awaiting.length > 5 ? ` และอีก ${room.awaiting.length - 5} คน` : ""}</p>}
          </article>
        ))}
      </div>}
    </section>
  );
}
