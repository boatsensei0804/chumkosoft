import "server-only";

import prisma from "@/lib/prisma";

export async function getActiveTerm(): Promise<{ id: string } | null> {
  return prisma.term.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true } });
}

/** Classrooms in the active academic year, for the entry filter. */
export async function findClassroomsForActiveYear() {
  return prisma.classroom.findMany({
    where: { isDeleted: false, academicYear: { isActive: true, isDeleted: false } },
    orderBy: { code: "asc" },
    select: { id: true, code: true, gradeLevel: true },
  });
}

/** Students enrolled in the active term (optionally one classroom), by code. */
export async function findEnrolledStudents(termId: string, classroomId?: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      termId,
      isDeleted: false,
      student: { isDeleted: false },
      ...(classroomId ? { classroomId } : {}),
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
