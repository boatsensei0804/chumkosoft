import "server-only";
import { createHash } from "node:crypto";
import type { CurrentUser } from "@/lib/dal";
import prisma from "@/lib/prisma";
import { getLineDisplayNames } from "@/features/line/services/line-profiles";
import { validReportDate, type LeaveDailyReport } from "@/features/leave/daily-report";

export async function getLeaveDailyReport(user: CurrentUser, date: string, allDates = false): Promise<LeaveDailyReport> {
  if (user.role !== "ADMIN" && user.role !== "TEACHER") throw new Error("Forbidden");
  if (!validReportDate(date)) throw new Error("Invalid report date");
  const term = await prisma.term.findFirst({ where: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } }, select: { id: true, name: true, academicYearId: true } });
  if (!term) return { date, term: null, totalStudents: 0, teacherScoped: user.role !== "ADMIN", allDates, items: [] };
  // The denominator is all currently enrolled students, even for advisor-scoped views.
  const enrollments = await prisma.enrollment.findMany({ where: { termId: term.id, isDeleted: false, student: { isDeleted: false }, classroom: { isDeleted: false, academicYearId: term.academicYearId } }, select: { studentId: true } });
  const ids = [...new Set(enrollments.map(enrollment => enrollment.studentId))];
  const day = new Date(`${date}T00:00:00Z`);
  const rows = await prisma.leaveRequest.findMany({
    where: { termId: term.id, isDeleted: false, studentId: { in: ids }, ...(allDates ? {} : { startDate: { lte: day }, endDate: { gte: day } }), classroom: { isDeleted: false, ...(user.role === "ADMIN" ? {} : { advisors: { some: { staffId: user.staffId ?? "__no_staff__" } } }) } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: { id: true, studentId: true, parentLineUserId: true, kind: true, expectedArrivalTime: true, startDate: true, endDate: true, reason: true, status: true, reviewNote: true, advisorNotifiedCount: true, advisorLineTargets: true, createdAt: true,
      student: { select: { studentCode: true, firstName: true, lastName: true, guardians: { where: { isDeleted: false }, select: { fullName: true, relation: true, lineUserId: true } } } }, classroom: { select: { code: true } } },
  });
  const names = await getLineDisplayNames(rows.map(row => row.parentLineUserId), { lookupBudgetMs: 6000 });
  return { date, term: term.name, totalStudents: ids.length, teacherScoped: user.role !== "ADMIN", allDates, items: rows.map(row => ({
    id: row.id, studentId: row.studentId, studentCode: row.student.studentCode, studentName: `${row.student.firstName} ${row.student.lastName}`, classroomCode: row.classroom.code,
    kind: row.kind, expectedArrivalTime: row.expectedArrivalTime, startDate: row.startDate.toISOString().slice(0, 10), endDate: row.endDate.toISOString().slice(0, 10), reason: row.reason, status: row.status, reviewNote: row.reviewNote,
    advisorNotifiedCount: row.advisorNotifiedCount, advisorTargetCount: row.advisorLineTargets.length, createdAt: row.createdAt.toISOString(),
    sender: { displayName: names.get(row.parentLineUserId) ?? null,
      guardianNames: row.student.guardians.filter(guardian => guardian.lineUserId === row.parentLineUserId).map(guardian => `${guardian.fullName}${guardian.relation ? ` (${guardian.relation})` : ""}`),
      reference: createHash("sha256").update(row.parentLineUserId).digest("hex").slice(0, 12).toUpperCase() },
  })) };
}
