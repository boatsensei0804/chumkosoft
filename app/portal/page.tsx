import type { Metadata } from "next";
import { GraduationCap, CalendarDays } from "lucide-react";
import WeeklySchedule from "@/features/portal/components/weekly-schedule";
import { getCurrentUser } from "@/lib/dal";
import { getPortalOverview } from "@/features/portal/services/portal-service";
import { thaiGreeting, formatThaiWeekdayLong } from "@/utils/thai-date";
import Mascot from "@/components/ui/mascot";
import MascotEmptyState from "@/components/ui/mascot-empty-state";

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
        className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-brand/15 bg-gradient-to-br from-brand-soft via-bg to-bg px-5 py-5 shadow-sm sm:px-7 sm:py-6"
      >
        <div>
          <p className="text-[12.5px] text-muted">{formatThaiWeekdayLong(now)}</p>
          <h1 className="mt-1 text-[24px] font-bold tracking-tight text-ink-strong sm:text-[28px]">{heading}</h1>
          {overview.classroomCode && (
            <p className="mt-2 inline-flex items-center gap-2 text-[13.5px] text-muted">
              <GraduationCap className="size-4" />
              ชั้น {overview.classroomCode} · {overview.gradeLevel}
              {overview.termLabel ? ` · ${overview.termLabel}` : ""}
            </p>
          )}
        </div>
        <Mascot pose="welcome" size={132} decorative priority className="hidden sm:block" />
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
    <MascotEmptyState
      title="ยังไม่มีตารางเรียน"
      description={studentResolved
        ? "ยังไม่มีการจัดชั้นเรียนหรือตารางเรียนในภาคเรียนปัจจุบัน กรุณาติดต่อเจ้าหน้าที่ทะเบียน"
        : "ยังไม่มีข้อมูลนักเรียนที่เชื่อมกับบัญชีนี้ กรุณาติดต่อเจ้าหน้าที่ทะเบียน"}
    />
  );
}
