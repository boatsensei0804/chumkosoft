import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import LeaveRequestsBrowser from "@/features/leave/components/leave-requests-browser";
import { listLeaveRequests } from "@/features/leave/services/leave-review-service";
import { requireRoles } from "@/lib/dal";

export const metadata: Metadata = { title: "คำขอลา · chumkosoft" };
export const dynamic = "force-dynamic";

export default async function LeaveRequestsPage(): Promise<React.ReactNode> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  const rows = await listLeaveRequests(user);
  const items = rows.map((row) => ({
    id: row.id,
    studentCode: row.student.studentCode,
    studentName: `${row.student.firstName} ${row.student.lastName}`,
    classroomCode: row.classroom.code,
    kind: row.kind,
    startDate: row.startDate.toISOString().slice(0, 10),
    endDate: row.endDate.toISOString().slice(0, 10),
    reason: row.reason,
    status: row.status,
    reviewNote: row.reviewNote,
    advisorNotifiedCount: row.advisorNotifiedCount,
    advisorTargetCount: row.advisorLineTargets.length,
    createdAt: row.createdAt.toISOString(),
  }));
  return <>
    <PageHeader title="คำขอลาจากผู้ปกครอง" subtitle="ตรวจคำขอที่ผู้ปกครองส่งทาง LINE และพิจารณาสถานะลาในระบบ" />
    <LeaveRequestsBrowser items={items} isAdmin={user.role === "ADMIN"} />
  </>;
}
