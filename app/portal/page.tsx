import type { Metadata } from "next";
import { GraduationCap, CalendarDays } from "lucide-react";
import WeeklySchedule from "@/features/portal/components/weekly-schedule";
import { getCurrentUser } from "@/lib/dal";
import { getPortalOverview } from "@/features/portal/services/portal-service";
import { thaiGreeting, formatThaiWeekdayLong } from "@/utils/thai-date";

export const metadata: Metadata = {
  title: "หน้าของฉัน — chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function PortalPage(): Promise<React.ReactNode> {
  const now = new Date();
  const user = await getCurrentUser();
  const overview = await getPortalOverview(user.id, user.role);

  const heading = user.firstName ? `${thaiGreeting(now)} คุณ${user.firstName}` : thaiGreeting(now);
  const roleNote =
    user.role === "PARENT" && overview.studentName ? `ตารางเรียนของ ${overview.studentName}` : "ตารางเรียนของฉัน";

  return (
    <div className="flex flex-col gap-6">
      <section
        className="relative overflow-hidden rounded-[20px] px-6 py-6 sm:px-8"
        style={{ background: "linear-gradient(115deg, var(--band-from) 0%, var(--band-to) 100%)", boxShadow: "var(--shadow-md)" }}
      >
        <p className="text-[12.5px]" style={{ color: "var(--band-muted)" }}>
          {formatThaiWeekdayLong(now)}
        </p>
        <h1 className="mt-1 text-[24px] font-bold tracking-tight sm:text-[28px]" style={{ color: "var(--band-ink)" }}>
          {heading}
        </h1>
        {overview.classroomCode && (
          <p className="mt-2 inline-flex items-center gap-2 text-[13.5px]" style={{ color: "var(--band-muted)" }}>
            <GraduationCap className="size-4" />
            ชั้น {overview.classroomCode} · {overview.gradeLevel}
            {overview.termLabel ? ` · ${overview.termLabel}` : ""}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-brand-strong" />
          <h2 className="text-[16px] font-bold text-ink-strong">{roleNote}</h2>
        </div>

        {overview.hasSchedule ? (
          <WeeklySchedule overview={overview} />
        ) : (
          <EmptyState studentResolved={overview.studentName !== null} />
        )}
      </section>
    </div>
  );
}

function EmptyState({ studentResolved }: { studentResolved: boolean }): React.ReactNode {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[16px] px-6 py-16 text-center"
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}
    >
      <span
        className="grid size-12 place-items-center rounded-full"
        style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }}
        aria-hidden="true"
      >
        <CalendarDays className="size-6" />
      </span>
      <p className="text-[15px] font-semibold text-ink-strong">ยังไม่มีตารางเรียน</p>
      <p className="max-w-sm text-[13.5px] text-muted">
        {studentResolved
          ? "ยังไม่มีการจัดชั้นเรียนหรือตารางเรียนในภาคเรียนปัจจุบัน กรุณาติดต่อเจ้าหน้าที่ทะเบียน"
          : "ยังไม่มีข้อมูลนักเรียนที่เชื่อมกับบัญชีนี้ กรุณาติดต่อเจ้าหน้าที่ทะเบียน"}
      </p>
    </div>
  );
}
