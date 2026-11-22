import Link from "next/link";
import type { Metadata } from "next";
import { UserCheck } from "lucide-react";
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

interface AttendancePageProps {
  searchParams: Promise<{ mode?: string; offering?: string; classroom?: string; date?: string; month?: string; filter?: string }>;
}

export default async function AttendancePage({ searchParams }: AttendancePageProps): Promise<React.ReactNode> {
  // Authoritative RBAC + who's looking: admins see every class; a teacher is
  // scoped to their own teaching offerings and advisory classrooms.
  const user = await requireRoles(STAFF_ROLES);
  const teacherScope = user.role === "ADMIN" ? null : user.staffId ?? "__no_staff__";

  const params = await searchParams;
  const mode = params.mode === "school" ? "school" : params.mode === "homeroom" ? "homeroom" : "class";
  const date = params.date ?? todayInBangkok();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : date.slice(0, 7);

  const scopeNote =
    user.role === "ADMIN"
      ? "ผู้ดูแลระบบ — เห็นทุกห้องทุกวิชา"
      : "ครูผู้สอน — เห็นเฉพาะวิชาและห้องที่ปรึกษาของคุณ";

  return (
    <>
      <PageHeader compact title="เช็คชื่อ" subtitle="เช็คชื่อรายวิชา เช็คชื่อประจำห้อง และบันทึกเวลาเข้า–ออกโรงเรียน" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AttendanceModeTabs mode={mode} />
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <UserCheck className="size-[15px]" />
            {scopeNote}
          </span>
        </div>
        {mode === "class" ? (
          <ClassMode selectedOfferingId={params.offering ?? ""} date={date} month={month} teacherScope={teacherScope} />
        ) : mode === "school" ? (
          <SchoolMode classroomId={params.classroom ?? ""} date={date} month={month} teacherScope={teacherScope} />
        ) : (
          <HomeroomMode classroomId={params.classroom ?? ""} date={date} month={month} teacherScope={teacherScope} uncheckedOnly={params.filter === "unchecked"} />
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
  uncheckedOnly,
}: {
  classroomId: string;
  date: string;
  month: string;
  teacherScope: string | null;
  uncheckedOnly: boolean;
}): Promise<React.ReactNode> {
  if (classroomId) {
    const [roster, calendar] = await Promise.all([getDailyClassRoster(date, classroomId, teacherScope), getDailyRollCallCalendar(month, teacherScope, classroomId)]);
    return roster ? <>{calendar && <AttendanceDateOverview mode="homeroom" month={month} selectedDate={date} days={calendar} classroomId={classroomId} />}<DailyRollCallRoster roster={roster} uncheckedOnly={uncheckedOnly} /></> : <PromptCard title="ไม่พบห้องเรียน" message="ห้องเรียนนี้ไม่มีในภาคเรียนปัจจุบัน หรือคุณไม่มีสิทธิ์เข้าถึง" />;
  }

  const [calendar, rooms] = await Promise.all([
    getDailyRollCallCalendar(month, teacherScope),
    getDailyRollCallOverview(date, teacherScope),
  ]);
  return (
    <>
      {calendar && <AttendanceDateOverview mode="homeroom" month={month} selectedDate={date} days={calendar} />}
      {rooms && <DailyRollCallOverview date={date} rooms={rooms} />}
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
        <Link href={`/dashboard/attendance?${new URLSearchParams({ mode: "class", offering: nextOffering.id, date })}`} className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-brand-ink hover:border-brand">
          <strong>{nextSlot.inProgress ? "คาบปัจจุบัน" : "คาบถัดไปวันนี้"}</strong>
          <span>{nextOffering.label} · {nextSlot.period.startTime}–{nextSlot.period.endTime} น.</span>
          <span className="ml-auto font-semibold">เปิดเช็กชื่อ</span>
        </Link>
      )}
      <AttendanceControls offerings={offerings} selectedOfferingId={selectedOfferingId} date={date} />
      {calendar && <AttendanceDateOverview mode="class" month={month} selectedDate={date} days={calendar} offeringId={selectedOfferingId} />}
      {offerings.length === 0 ? (
        <PromptCard title="ยังไม่มีรายวิชาที่เปิดสอน" message="กรุณาเปิดรายวิชาและจัดตารางสอนในภาคเรียนปัจจุบันก่อนเริ่มเช็คชื่อ" />
      ) : !selectedOfferingId ? (
        <PromptCard title="เลือกชั้นเรียนเพื่อเริ่มเช็คชื่อ" message="เลือกรายวิชาและวันที่จากด้านบน แล้วระบบจะแสดงรายชื่อนักเรียน" />
      ) : roster ? (
        <AttendanceRoster roster={roster} />
      ) : (
        <PromptCard title="ไม่พบข้อมูล" message="ไม่พบรายวิชาที่เลือก หรือรายวิชานี้ไม่ใช่ของคุณ กรุณาเลือกใหม่อีกครั้ง" />
      )}
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
      {calendar && <AttendanceDateOverview mode="school" month={month} selectedDate={date} days={calendar} classroomId={classroomId} />}
      {roster && <SchoolEntrySummary roster={roster} classrooms={classrooms.filter((room) => !classroomId || room.id === classroomId)} />}
      {roster ? (
        <SchoolEntryRoster roster={roster} />
      ) : (
        <PromptCard title="วันที่ไม่ถูกต้อง" message="กรุณาเลือกวันที่ใหม่อีกครั้ง" />
      )}
    </>
  );
}

function PromptCard({ title, message }: { title: string; message: string }): React.ReactNode {
  return <MascotEmptyState pose="schedule" title={title} description={message} />;
}
