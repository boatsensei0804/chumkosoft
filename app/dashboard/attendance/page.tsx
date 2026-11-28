import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock3, ScanLine, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import MascotEmptyState from "@/components/ui/mascot-empty-state";
import PageHeader from "@/features/dashboard/components/page-header";
import AttendanceModeTabs from "@/features/attendance/components/attendance-mode-tabs";
import AttendanceControls from "@/features/attendance/components/attendance-controls";
import AttendanceRoster from "@/features/attendance/components/attendance-roster";
import SchoolEntryControls from "@/features/attendance/components/school-entry-controls";
import SchoolEntryRoster from "@/features/attendance/components/school-entry-roster";
import SchoolEntrySummary from "@/features/attendance/components/school-entry-summary";
import AttendanceDateOverview from "@/features/attendance/components/attendance-date-overview";
import DailyRollCallOverview from "@/features/attendance/components/daily-roll-call-overview";
import DailyRollCallRoster from "@/features/attendance/components/daily-roll-call-roster";
import { listAttendanceOfferings, getAttendanceCalendar, getNextTeachingSlot, getRoster } from "@/features/attendance/services/attendance-service";
import { listEntryClassrooms, getSchoolEntryCalendar, getSchoolEntryRoster } from "@/features/attendance/services/school-entry-service";
import { getDailyRollCallCalendar, getDailyRollCallOverview, getDailyClassRoster } from "@/features/attendance/services/daily-roll-call-service";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";

export const metadata: Metadata = {
  title: "เช็คชื่อ · chumkosoft",
};

export const dynamic = "force-dynamic";

function todayInBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

function attendanceDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) return value;
  }
  return todayInBangkok();
}

interface AttendancePageProps {
  searchParams: Promise<{ mode?: string; offering?: string; classroom?: string; date?: string; month?: string; filter?: string }>;
}

const attendanceDescriptions = {
  class: "เลือกวิชาและวันที่เพื่อบันทึกการเข้าเรียนรายคาบ",
  homeroom: "บันทึกสถานะนักเรียนประจำวันและติดตามห้องที่เช็คชื่อแล้ว",
  school: "ดูเวลาเข้า–ออกโรงเรียนจากจุดสแกนและรายการที่ครูบันทึก",
};

export default async function AttendancePage({ searchParams }: AttendancePageProps): Promise<React.ReactNode> {
  // Authoritative RBAC + who's looking: admins see every class; a teacher is
  // scoped to their own teaching offerings and advisory classrooms.
  const user = await requireRoles(STAFF_ROLES);
  const teacherScope = user.role === "ADMIN" ? null : user.staffId ?? "__no_staff__";

  const params = await searchParams;
  const mode = params.mode === "school" ? "school" : params.mode === "homeroom" ? "homeroom" : "class";
  const date = attendanceDate(params.date);
  const classroomId = typeof params.classroom === "string" ? params.classroom : "";
  const month = typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : date.slice(0, 7);

  const scopeNote =
    user.role === "ADMIN"
      ? "ผู้ดูแลระบบ — เห็นทุกห้องทุกวิชา"
      : "ครูผู้สอน — เห็นเฉพาะวิชาและห้องที่ปรึกษาของคุณ";

  return (
    <>
      <PageHeader pose="schedule" compact title="เช็คชื่อ" subtitle={attendanceDescriptions[mode]}
        actions={mode === "school" && user.role === "ADMIN" && <Button asChild variant="outline" className="min-h-11">
          <Link href="/dashboard/kiosk#zkteco"><ScanLine aria-hidden="true" />จัดการเครื่องสแกน</Link>
        </Button>}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-card p-2 sm:p-3 xl:flex-row xl:items-center xl:justify-between xl:gap-5">
          <AttendanceModeTabs mode={mode} date={date} month={month} classroomId={classroomId} />
          <span className="inline-flex items-start gap-1.5 px-2 py-1 text-xs leading-relaxed text-muted">
            <UserCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {scopeNote}
          </span>
        </div>
        {mode === "class" ? (
          <ClassMode selectedOfferingId={params.offering ?? ""} date={date} month={month} teacherScope={teacherScope} />
        ) : mode === "school" ? (
          <SchoolMode classroomId={classroomId} date={date} month={month} teacherScope={teacherScope} />
        ) : (
          <HomeroomMode classroomId={classroomId} date={date} month={month} teacherScope={teacherScope} filter={params.filter} />
        )}
      </div>
    </>
  );
}

async function HomeroomMode({
  classroomId,
  date,
  month,
  teacherScope,
  filter,
}: {
  classroomId: string;
  date: string;
  month: string;
  teacherScope: string | null;
  filter?: string;
}): Promise<React.ReactNode> {
  if (classroomId) {
    const [roster, calendar] = await Promise.all([getDailyClassRoster(date, classroomId, teacherScope), getDailyRollCallCalendar(month, teacherScope, classroomId)]);
    if (!roster) return <PromptCard title="ไม่พบห้องเรียน" message="ห้องเรียนนี้ไม่มีในภาคเรียนปัจจุบัน หรือคุณไม่มีสิทธิ์เข้าถึง" />;
    return (
      <>
        <DailyRollCallRoster roster={roster} month={month} initialFilter={filter} />
        {calendar && <AttendanceDateOverview mode="homeroom" month={month} selectedDate={date} days={calendar} classroomId={classroomId} />}
      </>
    );
  }

  const [calendar, rooms] = await Promise.all([
    getDailyRollCallCalendar(month, teacherScope),
    getDailyRollCallOverview(date, teacherScope),
  ]);
  return (
    <>
      {rooms && <DailyRollCallOverview date={date} rooms={rooms} />}
      {calendar && <AttendanceDateOverview mode="homeroom" month={month} selectedDate={date} days={calendar} />}
    </>
  );
}

async function ClassMode({
  selectedOfferingId,
  date,
  month,
  teacherScope,
}: {
  selectedOfferingId: string;
  date: string;
  month: string;
  teacherScope: string | null;
}): Promise<React.ReactNode> {
  const [offerings, nextSlot] = await Promise.all([
    listAttendanceOfferings(teacherScope),
    !selectedOfferingId && teacherScope ? getNextTeachingSlot(date, teacherScope) : null,
  ]);
  const nextOffering = nextSlot && offerings.find((offering) => offering.id === nextSlot.courseOfferingId);
  const [roster, calendar] = selectedOfferingId
    ? await Promise.all([getRoster(selectedOfferingId, date, teacherScope), getAttendanceCalendar(selectedOfferingId, month, teacherScope)])
    : [null, null];

  return (
    <>
      {nextSlot && nextOffering && (
        <Link href={`/dashboard/attendance?${new URLSearchParams({ mode: "class", offering: nextOffering.id, date })}`} className="group flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-brand-soft p-3 text-sm text-brand-ink transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-4">
          <Clock3 className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 grow">
            <strong className="block">{nextSlot.inProgress ? "คาบปัจจุบัน" : "คาบถัดไปวันนี้"}</strong>
            <span className="mt-0.5 block break-words">{nextOffering.label} · {nextSlot.period.startTime}–{nextSlot.period.endTime} น.</span>
          </span>
          <span className="flex items-center gap-1.5 font-bold group-hover:underline">เปิดเช็คชื่อ <ArrowRight className="size-4" aria-hidden="true" /></span>
        </Link>
      )}
      <AttendanceControls offerings={offerings} selectedOfferingId={selectedOfferingId} date={date} />
      {offerings.length === 0 ? (
        <PromptCard title="ยังไม่มีรายวิชาที่เปิดสอน" message="กรุณาเปิดรายวิชาและจัดตารางสอนในภาคเรียนปัจจุบันก่อนเริ่มเช็คชื่อ" />
      ) : !selectedOfferingId ? (
        <PromptCard title="เลือกชั้นเรียนเพื่อเริ่มเช็คชื่อ" message="เลือกรายวิชาและวันที่จากด้านบน แล้วระบบจะแสดงรายชื่อนักเรียน" />
      ) : roster ? (
        <AttendanceRoster roster={roster} />
      ) : (
        <PromptCard title="ไม่พบข้อมูล" message="ไม่พบรายวิชาที่เลือก หรือรายวิชานี้ไม่ใช่ของคุณ กรุณาเลือกใหม่อีกครั้ง" />
      )}
      {calendar && <AttendanceDateOverview mode="class" month={month} selectedDate={date} days={calendar} offeringId={selectedOfferingId} />}
    </>
  );
}

async function SchoolMode({
  classroomId,
  date,
  month,
  teacherScope,
}: {
  classroomId: string;
  date: string;
  month: string;
  teacherScope: string | null;
}): Promise<React.ReactNode> {
  const [classrooms, roster, calendar] = await Promise.all([
    listEntryClassrooms(teacherScope),
    getSchoolEntryRoster(date, classroomId, teacherScope),
    getSchoolEntryCalendar(month, classroomId, teacherScope),
  ]);

  return (
    <>
      <SchoolEntryControls classrooms={classrooms} classroomId={classroomId} date={date} />
      {roster ? (
        <SchoolEntryRoster roster={roster} />
      ) : (
        <PromptCard title="วันที่ไม่ถูกต้อง" message="กรุณาเลือกวันที่ใหม่อีกครั้ง" />
      )}
      {calendar && <AttendanceDateOverview mode="school" month={month} selectedDate={date} days={calendar} classroomId={classroomId} />}
      {roster && <SchoolEntrySummary roster={roster} classrooms={classrooms.filter((room) => !classroomId || room.id === classroomId)} />}
    </>
  );
}

function PromptCard({ title, message }: { title: string; message: string }): React.ReactNode {
  return <MascotEmptyState pose="schedule" title={title} description={message} />;
}
