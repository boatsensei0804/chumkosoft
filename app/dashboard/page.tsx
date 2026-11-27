import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDailyRollCallOverview } from "@/features/attendance/services/daily-roll-call-service";
import Announcements from "@/features/dashboard/components/announcements";
import DailySchoolOverview from "@/features/dashboard/components/daily-school-overview";
import EnrolmentTrend from "@/features/dashboard/components/enrolment-trend";
import PageHeader from "@/features/dashboard/components/page-header";
import SectionCard from "@/features/dashboard/components/section-card";
import StudentsTable from "@/features/dashboard/components/students-table";
import SummaryFigures from "@/features/dashboard/components/summary-figures";
import TodaySchedule from "@/features/dashboard/components/today-schedule";
import { getCurrentUser } from "@/lib/dal";
import prisma from "@/lib/prisma";
import {
  getActiveTermLabel,
  getEnrolmentTrend,
  getSummaryFigures,
  getTodaySchedule,
  listAnnouncements,
} from "@/services/dashboard-service";
import { listStudentSummaries } from "@/services/student-service";
import { formatThaiWeekdayLong, thaiGreeting } from "@/utils/thai-date";

export const metadata: Metadata = { title: "ภาพรวม · chumkosoft" };
export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage(): Promise<React.ReactNode> {
  const now = new Date();
  const user = await getCurrentUser();
  const isAdmin = user.role === "ADMIN";
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
  const advisorId = isAdmin ? null : user.staffId ?? "__no_staff__";

  const [term, rooms, pendingLeave, schedule, registry, announcements] = await Promise.all([
    getActiveTermLabel(),
    getDailyRollCallOverview(date, advisorId),
    prisma.leaveRequest.count({
      where: {
        status: "PENDING", isDeleted: false,
        term: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } },
        student: { isDeleted: false },
        classroom: {
          isDeleted: false,
          ...(advisorId ? { advisors: { some: { staffId: advisorId } } } : {}),
        },
      },
    }),
    isAdmin ? null : getTodaySchedule(user.staffId, now),
    isAdmin ? Promise.all([getSummaryFigures(), listStudentSummaries(6), getEnrolmentTrend()]) : null,
    listAnnouncements(5),
  ]);
  const greeting = user.firstName ? thaiGreeting(now) + " คุณ" + user.firstName : thaiGreeting(now);

  return (
    <>
      <PageHeader
        title={greeting}
        subtitle={formatThaiWeekdayLong(now) + " · " + term}
        actions={isAdmin ? <>
          <Button asChild><Link href="/dashboard/students">ค้นหานักเรียน</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/timetable">จัดตารางสอน</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/attendance?mode=school">ดูเวลาเข้า–ออก</Link></Button>
        </> : <>
          <Button asChild><Link href="/dashboard/attendance?mode=class">เช็คชื่อรายคาบ</Link></Button>
          {Boolean(rooms?.length) && <Button asChild variant="outline"><Link href="/dashboard/attendance?mode=homeroom">เช็คชื่อประจำห้อง</Link></Button>}
        </>}
      />
      <div className="flex flex-col gap-4">
        {pendingLeave > 0 && (
          <Link href="/dashboard/leave-requests?view=all&status=pending#leave-list" className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-brand-ink hover:bg-school-panel-tint">
            <CalendarX2 className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">คำขอลา / ขอมาสายรอพิจารณา {pendingLeave.toLocaleString("th-TH")} รายการ</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        )}
        {schedule && <TodaySchedule date={date} {...schedule} />}
        {(isAdmin || Boolean(rooms?.length)) && <DailySchoolOverview rooms={rooms ?? []} date={date} scoped={!isAdmin} />}
        {registry && (
          <details className="rounded-xl border border-line bg-card px-4 py-3">
            <summary className="min-h-8 cursor-pointer font-semibold text-brand-ink">สรุปทะเบียนโรงเรียน</summary>
            <div className="mt-3"><SummaryFigures figures={registry[0]} /></div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <EnrolmentTrend data={registry[2]} />
              <SectionCard
                title="นักเรียนที่ลงทะเบียนล่าสุด"
                action={<Button asChild variant="ghost" size="sm"><Link href="/dashboard/students">ดูทั้งหมด <ArrowRight aria-hidden="true" /></Link></Button>}
                bodyClassName="p-0"
              >
                <StudentsTable students={registry[1]} />
              </SectionCard>
            </div>
          </details>
        )}
        <Announcements items={announcements} />
      </div>
    </>
  );
}
