import type { Metadata } from "next";
import { UserCheck } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import AttendanceModeTabs from "@/features/attendance/components/attendance-mode-tabs";
import AttendanceControls from "@/features/attendance/components/attendance-controls";
import AttendanceRoster from "@/features/attendance/components/attendance-roster";
import SchoolEntryControls from "@/features/attendance/components/school-entry-controls";
import SchoolEntryRoster from "@/features/attendance/components/school-entry-roster";
import { listAttendanceOfferings, getRoster } from "@/features/attendance/services/attendance-service";
import { listEntryClassrooms, getSchoolEntryRoster } from "@/features/attendance/services/school-entry-service";
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
  searchParams: Promise<{ mode?: string; offering?: string; classroom?: string; date?: string }>;
}

export default async function AttendancePage({ searchParams }: AttendancePageProps): Promise<React.ReactNode> {
  // Authoritative RBAC + who's looking: admins see every class; a teacher is
  // scoped to their own teaching offerings and advisory classrooms.
  const user = await requireRoles(STAFF_ROLES);
  const teacherScope = user.role === "ADMIN" ? null : user.staffId;

  const params = await searchParams;
  const mode = params.mode === "school" ? "school" : "class";
  const date = params.date ?? todayInBangkok();

  const scopeNote =
    user.role === "ADMIN"
      ? "ผู้ดูแลระบบ — เห็นทุกห้องทุกวิชา"
      : "ครูผู้สอน — เห็นเฉพาะวิชาและห้องที่ปรึกษาของคุณ";

  return (
    <>
      <PageHeader title="เช็คชื่อ" subtitle="บันทึกการมาเรียนรายคาบ และการเข้า–ออกโรงเรียนรายวัน" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <AttendanceModeTabs mode={mode} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[12.5px] font-semibold text-brand-ink">
            <UserCheck className="size-[15px]" />
            {scopeNote}
          </span>
        </div>
        {mode === "class" ? (
          <ClassMode selectedOfferingId={params.offering ?? ""} date={date} teacherScope={teacherScope} />
        ) : (
          <SchoolMode classroomId={params.classroom ?? ""} date={date} teacherScope={teacherScope} />
        )}
      </div>
    </>
  );
}

async function ClassMode({
  selectedOfferingId,
  date,
  teacherScope,
}: {
  selectedOfferingId: string;
  date: string;
  teacherScope: string | null;
}): Promise<React.ReactNode> {
  const offerings = await listAttendanceOfferings(teacherScope);
  const roster = selectedOfferingId ? await getRoster(selectedOfferingId, date, teacherScope) : null;

  return (
    <>
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
    </>
  );
}

async function SchoolMode({
  classroomId,
  date,
  teacherScope,
}: {
  classroomId: string;
  date: string;
  teacherScope: string | null;
}): Promise<React.ReactNode> {
  const [classrooms, roster] = await Promise.all([
    listEntryClassrooms(teacherScope),
    getSchoolEntryRoster(date, classroomId, teacherScope),
  ]);

  return (
    <>
      <SchoolEntryControls classrooms={classrooms} classroomId={classroomId} date={date} />
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
