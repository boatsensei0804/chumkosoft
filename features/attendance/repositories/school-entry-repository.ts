import "server-only";

import prisma from "@/lib/prisma";

export async function getActiveTerm(): Promise<{ id: string } | null> {
  return prisma.term.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true } });
}

/**
 * Classrooms in the active academic year, for the entry filter.
 * When `advisorStaffId` is given, only classrooms that teacher advises are
 * returned (teacher sees only their homeroom(s); admin passes null → all).
 */
export async function findClassroomsForActiveYear(advisorStaffId?: string | null) {
  return prisma.classroom.findMany({
    where: {
      isDeleted: false,
      academicYear: { isActive: true, isDeleted: false },
      ...(advisorStaffId ? { advisors: { some: { staffId: advisorStaffId } } } : {}),
    },
    orderBy: { code: "asc" },
    select: { id: true, code: true, gradeLevel: true },
  });
}

/**
 * Students enrolled in the active term (optionally one classroom), by code.
 * When `advisorStaffId` is given, results are restricted to classrooms that
 * teacher advises — so a teacher only ever sees their homeroom students, and a
 * classroomId that isn't theirs yields an empty roster (URL-tamper guard).
 */
export async function findEnrolledStudents(termId: string, classroomId?: string, advisorStaffId?: string | null) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      termId,
      isDeleted: false,
      student: { isDeleted: false },
      ...(classroomId ? { classroomId } : {}),
      ...(advisorStaffId ? { classroom: { advisors: { some: { staffId: advisorStaffId } } } } : {}),
    },
    orderBy: { student: { studentCode: "asc" } },
    select: {
      classroom: { select: { code: true } },
      student: { select: { id: true, studentCode: true, prefix: true, firstName: true, lastName: true } },
    },
  });
  return enrollments.map((e) => ({ ...e.student, classroomCode: e.classroom.code }));
}

/** Gate records for a date, keyed by student. */
export async function findEntries(termId: string, date: Date) {
  return prisma.schoolEntry.findMany({
    where: { termId, date, isDeleted: false },
    select: { studentId: true, checkInAt: true, checkOutAt: true, isLate: true },
  });
}

/** School gate records for a calendar month. */
export async function findEntriesInRange(termId: string, start: Date, endExclusive: Date) {
  return prisma.schoolEntry.findMany({
    where: { termId, date: { gte: start, lt: endExclusive }, isDeleted: false },
    select: { studentId: true, date: true, checkInAt: true, isLate: true },
  });
}

export async function getStudentTermRef(studentId: string, termId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, termId, isDeleted: false },
    select: { id: true },
  });
  return enrollment !== null;
}

/** Records a check-in (creates or reactivates the day's gate record). */
export async function upsertCheckIn(termId: string, studentId: string, date: Date, at: Date, isLate: boolean): Promise<void> {
  await prisma.schoolEntry.upsert({
    where: { studentId_date: { studentId, date } },
    update: { checkInAt: at, isLate, isDeleted: false, deletedAt: null },
    create: { termId, studentId, date, checkInAt: at, isLate, method: "MANUAL" },
  });
}

/** Records a check-out on an existing (or implicitly created) gate record. */
export async function upsertCheckOut(termId: string, studentId: string, date: Date, at: Date): Promise<void> {
  await prisma.schoolEntry.upsert({
    where: { studentId_date: { studentId, date } },
    update: { checkOutAt: at, isDeleted: false, deletedAt: null },
    create: { termId, studentId, date, checkInAt: at, checkOutAt: at, method: "MANUAL" },
  });
}
