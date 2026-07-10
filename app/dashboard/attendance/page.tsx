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
  const params = await searchParams;
  const mode = params.mode === "school" ? "school" : "class";
  const date = params.date ?? todayInBangkok();

  return (
    <>
      <PageHeader title="เช็คชื่อ" subtitle="บันทึกการมาเรียนรายคาบ และการเข้า–ออกโรงเรียนรายวัน" />

      <div className="flex flex-col gap-4">
        <AttendanceModeTabs mode={mode} />
        {mode === "class" ? (
          <ClassMode selectedOfferingId={params.offering ?? ""} date={date} />
        ) : (
          <SchoolMode classroomId={params.classroom ?? ""} date={date} />
        )}
      </div>
    </>
  );
}

async function ClassMode({ selectedOfferingId, date }: { selectedOfferingId: string; date: string }): Promise<React.ReactNode> {
  const offerings = await listAttendanceOfferings();
  const roster = selectedOfferingId ? await getRoster(selectedOfferingId, date) : null;

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
        <PromptCard title="ไม่พบข้อมูล" message="ไม่พบรายวิชาที่เลือกในภาคเรียนที่ใช้งาน กรุณาเลือกใหม่อีกครั้ง" />
      )}
    </>
  );
}

async function SchoolMode({ classroomId, date }: { classroomId: string; date: string }): Promise<React.ReactNode> {
  const [classrooms, roster] = await Promise.all([listEntryClassrooms(), getSchoolEntryRoster(date, classroomId)]);

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
    <div
      className="flex flex-col items-center gap-3 rounded-[16px] px-6 py-16 text-center"
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}
    >
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
        <UserCheck className="size-6" />
      </span>
      <p className="text-[15px] font-semibold text-ink-strong">{title}</p>
      <p className="max-w-sm text-[13.5px] text-muted">{message}</p>
    </div>
  );
}
