import "server-only";
import prisma from "@/lib/prisma";
import { getLineDisplayNames } from "./line-profiles";
import { reportStudent, summarizeLinks, type LineLinkReport, type RawLinkStudent } from "@/features/line/line-link-report";

export class InvalidReportClassroom extends Error {}

export async function getLineLinkReport(classroomId = "all", advisorStaffId?: string): Promise<LineLinkReport> {
  const generatedAt = new Date().toISOString();
  const term = await prisma.term.findFirst({ where: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } }, select: { id: true, name: true, academicYearId: true } });
  if (!term) return { term: "ยังไม่มีภาคเรียนปัจจุบัน", hasActiveTerm: false, generatedAt, rooms: [], overall: summarizeLinks([]), selectedId: "all", students: [] };
  const rooms = await prisma.classroom.findMany({ where: { academicYearId: term.academicYearId, isDeleted: false, ...(advisorStaffId ? { advisors: { some: { staffId: advisorStaffId } } } : {}) }, orderBy: { code: "asc" }, select: { id: true, code: true } });
  if (classroomId !== "all" && !rooms.some(room => room.id === classroomId)) throw new InvalidReportClassroom("ไม่พบห้องในภาคเรียนปัจจุบัน");
  const enrollments = await prisma.enrollment.findMany({
    where: { termId: term.id, isDeleted: false, classroomId: { in: rooms.map(room => room.id) }, student: { isDeleted: false } },
    orderBy: { student: { studentCode: "asc" } },
    select: { classroomId: true, classroom: { select: { code: true } }, student: { select: {
      id: true, studentCode: true, prefix: true, firstName: true, lastName: true,
      guardians: { where: { isDeleted: false }, orderBy: { createdAt: "asc" }, select: { prefix: true, fullName: true, relation: true, lineUserId: true, lineLinkCode: true } },
      lineAccounts: { orderBy: { createdAt: "asc" }, select: { lineUserId: true, lineLinkCode: true } },
    } } },
  });
  const raw: RawLinkStudent[] = enrollments.map(enrollment => ({
    id: enrollment.student.id, studentCode: enrollment.student.studentCode,
    studentName: [enrollment.student.prefix, enrollment.student.firstName, enrollment.student.lastName].filter(Boolean).join(" "),
    classroomId: enrollment.classroomId, classroom: enrollment.classroom.code,
    accounts: [
      ...enrollment.student.guardians.map(account => ({ guardianName: [account.prefix, account.fullName, account.relation ? `(${account.relation})` : ""].filter(Boolean).join(" "), lineUserId: account.lineUserId, code: account.lineLinkCode })),
      ...enrollment.student.lineAccounts.map(account => ({ guardianName: "ผู้ปกครอง (ผูกตรงกับนักเรียน)", lineUserId: account.lineUserId, code: account.lineLinkCode })),
    ],
  }));
  const all = raw.map(student => reportStudent(student));
  const selected = raw.filter(student => classroomId === "all" || student.classroomId === classroomId);
  // Bound uncached profile lookups; the binding state always comes from the DB.
  const names = await getLineDisplayNames(selected.flatMap(student => student.accounts.flatMap(account => account.lineUserId ? [account.lineUserId] : [])), { lookupBudgetMs: 6000 });
  return { term: term.name, hasActiveTerm: true, generatedAt, selectedId: classroomId,
    overall: summarizeLinks(all), rooms: rooms.map(room => ({ ...room, ...summarizeLinks(all.filter(student => student.classroomId === room.id)) })),
    students: selected.map(student => reportStudent(student, names)),
  };
}
