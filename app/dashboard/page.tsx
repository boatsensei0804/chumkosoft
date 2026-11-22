import DailySchoolOverview from "@/features/dashboard/components/daily-school-overview";
import { getDailyRollCallOverview } from "@/features/attendance/services/daily-roll-call-service";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import WelcomeBand from "@/features/dashboard/components/welcome-band";
import SummaryFigures from "@/features/dashboard/components/summary-figures";
import EnrolmentTrend from "@/features/dashboard/components/enrolment-trend";
import TodaySchedule from "@/features/dashboard/components/today-schedule";
import Announcements from "@/features/dashboard/components/announcements";
import SectionCard from "@/features/dashboard/components/section-card";
import StudentsTable from "@/features/dashboard/components/students-table";
import {
  getSummaryFigures,
  getTodaySchedule,
  getActiveTermLabel,
  getEnrolmentTrend,
  listAnnouncements,
} from "@/services/dashboard-service";
import { listStudentSummaries } from "@/services/student-service";
import { getCurrentUser } from "@/lib/dal";
import prisma from "@/lib/prisma";
import { thaiGreeting, formatThaiWeekdayLong } from "@/utils/thai-date";

export const metadata: Metadata = {
  title: "ภาพรวม · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage(): Promise<React.ReactNode> {
  const now = new Date();
  const [figures, recentStudents, todaySchedule, termLabel, user, enrolmentTrend, announcements] = await Promise.all([
    getSummaryFigures(),
    listStudentSummaries(6),
    getTodaySchedule(),
    getActiveTermLabel(),
    getCurrentUser(),
    getEnrolmentTrend(),
    listAnnouncements(5),
  ]);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
  const rooms = await getDailyRollCallOverview(date, user.role === "ADMIN" ? null : user.staffId ?? "__no_staff__");
  const pendingLeave = await prisma.leaveRequest.count({
    where: {
      status: "PENDING", isDeleted: false,
      term: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } },
      student: { isDeleted: false },
      classroom: {
        isDeleted: false,
        ...(user.role === "ADMIN" ? {} : { advisors: { some: { staffId: user.staffId ?? "__no_staff__" } } }),
      },
    },
  });
  const greeting = user.firstName ? `${thaiGreeting(now)} คุณ${user.firstName}` : thaiGreeting(now);
  return (
    <>
      <div className="flex flex-col gap-3">
        <WelcomeBand
          greeting={greeting}
          subtitle="จัดการงานโรงเรียนในที่เดียว ดูการเช็คชื่อ ทะเบียนนักเรียน และการสื่อสารกับผู้ปกครองได้ทันที"
          term={termLabel}
          date={formatThaiWeekdayLong(now)}
        />
        {pendingLeave > 0 && (
          <Link href="/dashboard/leave-requests?view=all&status=pending#leave-list" className="flex min-h-11 items-center gap-3 rounded-2xl border border-school-panel-border bg-school-panel px-4 py-2.5 text-sm font-semibold text-brand-ink hover:bg-school-panel-tint">
            <CalendarX2 className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">คำขอลา / ขอมาสายรอพิจารณา {pendingLeave.toLocaleString("th-TH")} รายการ</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        )}
        <DailySchoolOverview rooms={rooms ?? []} date={date} scoped={user.role !== "ADMIN"} />
        <details className="group rounded-[20px] border border-school-panel-border bg-school-panel px-4 py-3 shadow-school-panel">
          <summary className="cursor-pointer font-semibold text-brand-ink">ข้อมูลเพิ่มเติม: ทะเบียน ตารางเรียน และประกาศ</summary>
          <div className="mt-4"><h2 className="mb-3 text-lg font-bold text-ink-strong">ข้อมูลทะเบียนของโรงเรียน</h2><SummaryFigures figures={figures} /></div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
          <div className="flex flex-col gap-5">
            <EnrolmentTrend data={enrolmentTrend} />
            <SectionCard
              title="นักเรียนที่ลงทะเบียนล่าสุด"
              caption="6 รายการล่าสุด"
              action={
                <Button asChild variant="ghost" size="sm" className="text-brand-ink">
                  <Link href="/dashboard/students">
                    ดูทั้งหมด <ArrowRight className="size-4" />
                  </Link>
                </Button>
              }
              bodyClassName="p-0"
            >
              <StudentsTable students={recentStudents} />
            </SectionCard>
          </div>

          <div className="flex flex-col gap-5">
            <TodaySchedule
              items={todaySchedule.items}
              weekdayLabel={todaySchedule.weekdayLabel}
              classroomCode={todaySchedule.classroomCode}
              isSchoolDay={todaySchedule.isSchoolDay}
            />
            <Announcements items={announcements} />
          </div>
        </div>
        </details>
      </div>
    </>
  );
}
