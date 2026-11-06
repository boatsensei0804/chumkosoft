import type { Metadata } from "next";
import { UserCheck } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import AttendanceModeTabs from "@/features/attendance/components/attendance-mode-tabs";
import AttendanceControls from "@/features/attendance/components/attendance-controls";
import AttendanceRoster from "@/features/attendance/components/attendance-roster";
import SchoolEntryControls from "@/features/attendance/components/school-entry-controls";
import SchoolEntryRoster from "@/features/attendance/components/school-entry-roster";
import AttendanceCalendar from "@/features/attendance/components/attendance-calendar";
import DailyRollCallOverview from "@/features/attendance/components/daily-roll-call-overview";
import DailyRollCallRoster from "@/features/attendance/components/daily-roll-call-roster";
import { listAttendanceOfferings, getAttendanceCalendar, getRoster } from "@/features/attendance/services/attendance-service";
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
  searchParams: Promise<{ mode?: string; offering?: string; classroom?: string; date?: string; month?: string }>;
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
      <PageHeader title="เช็คชื่อ" subtitle="เช็คชื่อรายวิชา เช็คชื่อประจำห้อง และบันทึกเวลาเข้า–ออกโรงเรียน" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <AttendanceModeTabs mode={mode} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[12.5px] font-semibold text-brand-ink">
            <UserCheck className="size-[15px]" />
            {scopeNote}
          </span>
        </div>
        {mode === "class" ? (
          <ClassMode selectedOfferingId={params.offering ?? ""} date={date} month={month} teacherScope={teacherScope} />
        ) : mode === "school" ? (
          <SchoolMode classroomId={params.classroom ?? ""} date={date} month={month} teacherScope={teacherScope} />
        ) : (
          <HomeroomMode classroomId={params.classroom ?? ""} date={date} month={month} teacherScope={teacherScope} />
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
}: {
  classroomId: string;
  date: string;
  month: string;
  teacherScope: string | null;
}): Promise<React.ReactNode> {
  if (classroomId) {
    const roster = await getDailyClassRoster(date, classroomId, teacherScope);
    return roster ? <DailyRollCallRoster roster={roster} /> : <PromptCard title="ไม่พบห้องเรียน" message="ห้องเรียนนี้ไม่มีในภาคเรียนปัจจุบัน หรือคุณไม่มีสิทธิ์เข้าถึง" />;
  }

  const [calendar, rooms] = await Promise.all([
    getDailyRollCallCalendar(month, teacherScope),
    getDailyRollCallOverview(date, teacherScope),
  ]);
  return (
    <>
      {calendar && <AttendanceCalendar mode="homeroom" month={month} selectedDate={date} days={calendar} />}
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
  const offerings = await listAttendanceOfferings(teacherScope);
  const [roster, calendar] = selectedOfferingId
    ? await Promise.all([getRoster(selectedOfferingId, date, teacherScope), getAttendanceCalendar(selectedOfferingId, month, teacherScope)])
    : [null, null];

  return (
    <>
      <AttendanceControls offerings={offerings} selectedOfferingId={selectedOfferingId} date={date} />
      {calendar && <AttendanceCalendar mode="class" month={month} selectedDate={date} days={calendar} offeringId={selectedOfferingId} />}
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
      {calendar && <AttendanceCalendar mode="school" month={month} selectedDate={date} days={calendar} classroomId={classroomId} />}
      {roster ? (
        <SchoolEntryRoster roster={roster} />
      ) : (
        <PromptCard title="วันที่ไม่ถูกต้อง" message="กรุณาเลือกวันที่ใหม่อีกครั้ง" />
      )}
    </>
  );
}

function PromptCard({ title, message }: { title: string; message: string }): React.ReactNode {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
        <UserCheck className="size-6" />
      </span>
      <p className="text-[15px] font-semibold text-ink-strong">{title}</p>
      <p className="max-w-sm text-[13.5px] text-muted">{message}</p>
    </div>
  );
}
