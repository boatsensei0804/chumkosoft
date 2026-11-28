import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarX2, ClipboardCheck, GraduationCap, MessageSquare, ScanFace, ScanLine, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDailyRollCallOverview } from "@/features/attendance/services/daily-roll-call-service";
import Announcements from "@/features/dashboard/components/announcements";
import DailySchoolOverview from "@/features/dashboard/components/daily-school-overview";
import EnrolmentTrend from "@/features/dashboard/components/enrolment-trend";
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
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 sm:mb-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{greeting}</p>
          <h1 className="mt-1 wrap-anywhere text-3xl font-bold leading-[1.22] tracking-tight text-ink-strong sm:text-4xl">{isAdmin ? "ภาพรวมโรงเรียน" : "งานของฉันวันนี้"}</h1>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>{formatThaiWeekdayLong(now)} · {term}</span>
          </p>
        </div>
        <Button asChild className="h-11">
          <Link href={isAdmin ? "/dashboard/attendance?mode=homeroom" : "/dashboard/attendance?mode=class"}>
            <ClipboardCheck aria-hidden="true" />
            {isAdmin ? "เปิดเช็คชื่อประจำห้อง" : "เช็คชื่อรายคาบ"}
          </Link>
        </Button>
      </header>

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.44fr)]">
        <div className="min-w-0 space-y-5">
          {schedule && <TodaySchedule date={date} {...schedule} />}
          {(isAdmin || hasRooms) && <DailySchoolOverview rooms={rooms ?? []} date={date} scoped={!isAdmin} />}
        </div>
        <div className="min-w-0 space-y-5">
          <SectionCard title="งานที่ต้องทำ" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              <li>
                <Link href="/dashboard/leave-requests?view=all&status=pending#leave-list" className="group flex min-h-14 items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-brand-softer focus-visible:-outline-offset-2 sm:px-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning"><CalendarX2 className="size-[18px]" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">คำขอลาและขอมาสายรอพิจารณา</span>
                  <span className={pendingLeave ? "shrink-0 text-warning" : "shrink-0 text-muted"}>{pendingLeave.toLocaleString("th-TH")} รายการ</span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted group-hover:text-brand" />
                </Link>
              </li>
              {startedRooms.length > 0 && (
                <li className="px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><UsersRound className="size-[18px]" aria-hidden="true" /></span>
                    <span className="flex-1 font-semibold">เช็กชื่อประจำห้อง</span>
                    <span className={remainingRooms.length ? "text-muted" : "font-semibold text-success"}>ครบ {startedRooms.length - remainingRooms.length} จาก {startedRooms.length} ห้อง</span>
                  </div>
                  {remainingRooms.length > 0 && (
                    <ul className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto p-1">
                      {remainingRooms.map((room) => (
                        <li key={room.classroomId}>
                          <Link href={`/dashboard/attendance?${new URLSearchParams({ mode: "homeroom", date, classroom: room.classroomId, filter: "unchecked" })}#daily-roster`} className="inline-flex min-h-11 items-center rounded-lg bg-warning-soft px-3 text-sm font-semibold text-warning hover:underline">
                            {room.classroomCode} · ยังไม่เช็ก {room.unchecked} คน
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )}
            </ul>
          </SectionCard>
          <nav aria-label="งานที่ใช้บ่อย">
            <SectionCard title="งานที่ใช้บ่อย" bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {shortcuts.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className="group flex min-h-14 items-center gap-3 px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-softer focus-visible:-outline-offset-2 sm:px-5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="size-4" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1">{label}</span>
                      <ArrowRight className="size-4 shrink-0 text-muted group-hover:text-brand" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </nav>
          <Announcements items={announcements} />
        </div>
        {registry && (
          <details className="rounded-xl border border-line bg-card px-4 py-3 lg:col-span-2">
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
