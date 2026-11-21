import StatStrip from "@/components/ui/stat-strip";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import WeeklySchedule from "@/features/portal/components/weekly-schedule";
import { getCurrentUser } from "@/lib/dal";
import { getPortalOverview } from "@/features/portal/services/portal-service";
import { thaiGreeting, formatThaiWeekdayLong } from "@/utils/thai-date";
import MascotBanner from "@/features/dashboard/components/mascot-banner";
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
      <MascotBanner title={heading} category={user.role === "PARENT" ? "พื้นที่ของผู้ปกครอง" : "พื้นที่ของนักเรียน"} pose={user.role === "PARENT" ? "family" : "students"} scene={user.role === "PARENT" ? "/mascot/guardians-banner.webp" : "/mascot/overview-scene.webp"} subtitle={[formatThaiWeekdayLong(now), overview.classroomCode ? `ชั้น ${overview.classroomCode} · ${overview.gradeLevel}` : null, overview.termLabel].filter(Boolean).join(" · ")} />

      <StatStrip items={[
        { label: "นักเรียน", value: overview.studentName ?? "ยังไม่ได้เชื่อมข้อมูล", tone: "brand" },
        { label: "ห้องเรียน", value: overview.classroomCode ?? "ยังไม่กำหนด" },
        { label: "ภาคเรียน", value: overview.termLabel ?? "ยังไม่กำหนด" },
      ]} />
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
