import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarX2, ClipboardCheck, GraduationCap, MessageSquare, ScanFace, ScanLine, UsersRound } from "lucide-react";
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
  const hasRooms = Boolean(rooms?.length);
  const startedRooms = rooms?.filter((room) => room.total > 0) ?? [];
  const remainingRooms = startedRooms.filter((room) => room.unchecked > 0);
  const shortcuts = isAdmin ? [
    { href: "/dashboard/attendance?mode=school", label: "บันทึกเข้า–ออกโรงเรียน", icon: ScanLine },
    { href: "/dashboard/students", label: "รายชื่อนักเรียน", icon: GraduationCap },
    { href: "/dashboard/timetable", label: "จัดตารางสอน", icon: CalendarDays },
    { href: "/dashboard/kiosk#zkteco", label: "เครื่องสแกนใบหน้า", icon: ScanFace },
    { href: "/dashboard/line", label: "การแจ้งเตือน LINE", icon: MessageSquare },
  ] : [
    ...(hasRooms ? [{ href: "/dashboard/attendance?mode=homeroom", label: "เช็คชื่อประจำห้อง", icon: UsersRound }] : []),
    { href: "/dashboard/timetable", label: "ตารางสอนของฉัน", icon: CalendarDays },
    { href: "/dashboard/my-line", label: "LINE ของฉัน", icon: MessageSquare },
  ];

  return (
    <>
      <PageHeader
        title={isAdmin ? "ภาพรวมโรงเรียน" : "งานของฉันวันนี้"}
        subtitle={greeting + " · " + formatThaiWeekdayLong(now) + " · " + term}
        actions={<Button asChild className="h-11">
          <Link href={isAdmin ? "/dashboard/attendance?mode=homeroom" : "/dashboard/attendance?mode=class"}>
            <ClipboardCheck aria-hidden="true" />
            {isAdmin ? "เปิดเช็คชื่อประจำห้อง" : "เช็คชื่อรายคาบ"}
          </Link>
        </Button>}
      />
      <section aria-labelledby="today-work" className="mb-5 overflow-hidden rounded-2xl border border-line bg-card">
        <h2 id="today-work" className="border-b border-line px-4 py-3 text-base font-bold text-ink-strong sm:px-5">งานที่ต้องทำวันนี้</h2>
        <ul className="divide-y divide-line">
          {startedRooms.length > 0 && (
            <li className="px-4 py-3 sm:px-5">
              <p className="font-semibold">เช็กชื่อประจำห้อง <span className="font-normal text-muted">ครบ {startedRooms.length - remainingRooms.length} จาก {startedRooms.length} ห้อง</span></p>
              {remainingRooms.length > 0 ? <ul className="mt-2 flex flex-wrap gap-2">{remainingRooms.map((room) => (
                <li key={room.classroomId}><Link href={`/dashboard/attendance?${new URLSearchParams({ mode: "homeroom", date, classroom: room.classroomId, filter: "unchecked" })}`} className="inline-flex min-h-11 items-center rounded-lg bg-warning-soft px-3 text-sm font-semibold text-warning hover:underline">
                  {room.classroomCode} · ยังไม่เช็ก {room.unchecked} คน
                </Link></li>
              ))}</ul> : <p className="mt-1 text-sm font-medium text-success">เช็กชื่อครบทุกห้องแล้ว</p>}
            </li>
          )}
          <li><Link href="/dashboard/leave-requests?view=all&status=pending#leave-list" className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm font-semibold hover:bg-surface sm:px-5">
            <span className="inline-flex items-center gap-2"><CalendarX2 aria-hidden="true" className="size-4" /> คำขอลาและขอมาสายรอพิจารณา</span>
            <span className={pendingLeave ? "text-warning" : "text-muted"}>{pendingLeave} รายการ <ArrowRight aria-hidden="true" className="inline size-4" /></span>
          </Link></li>
        </ul>
      </section>
      <nav aria-labelledby="dashboard-shortcuts" className="mb-6 rounded-2xl border border-line bg-card p-4 sm:p-5">
        <h2 id="dashboard-shortcuts" className="mb-3 text-base font-bold text-ink-strong">งานที่ใช้บ่อย</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex min-h-14 h-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink motion-safe:transition-colors hover:border-line-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-brand">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-pretty">{label}</span>
                <ArrowRight className="size-4 shrink-0 text-muted group-hover:text-brand" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_248px] 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-5">
          {schedule && <TodaySchedule date={date} {...schedule} />}
          {(isAdmin || hasRooms) && <DailySchoolOverview rooms={rooms ?? []} date={date} scoped={!isAdmin} />}
        </div>
        <div className="min-w-0 space-y-5">
          <Announcements items={announcements} />
        </div>
        {registry && (
          <details className="rounded-xl border border-line bg-card px-4 py-3 xl:col-span-2">
            <summary className="min-h-8 cursor-pointer py-1 font-semibold text-brand-ink focus-visible:outline-2 focus-visible:outline-brand">สรุปทะเบียนโรงเรียน</summary>
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
      </div>
    </>
  );
}
