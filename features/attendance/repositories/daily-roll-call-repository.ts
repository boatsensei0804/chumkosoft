import "server-only";

import type { DailyRollCallStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function getActiveTerm() {
  return prisma.term.findFirst({
    where: { isActive: true, isDeleted: false },
    select: { id: true, academicYearId: true },
  });
}

export async function findClassrooms(termId: string, academicYearId: string, advisorStaffId?: string | null) {
  return prisma.classroom.findMany({
    where: {
      academicYearId,
      isDeleted: false,
      ...(advisorStaffId ? { advisors: { some: { staffId: advisorStaffId } } } : {}),
    },
    orderBy: { code: "asc" },
    select: { id: true, code: true, gradeLevel: true },
  }).then(async (classrooms) => {
    const activeClassroomIds = await prisma.enrollment.findMany({
      where: { termId, classroomId: { in: classrooms.map((c) => c.id) }, isDeleted: false },
      distinct: ["classroomId"],
      select: { classroomId: true },
    });
    const used = new Set(activeClassroomIds.map((row) => row.classroomId));
    return classrooms.filter((classroom) => used.has(classroom.id));
  });
}

export async function findEnrolledStudents(termId: string, classroomId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { termId, classroomId, isDeleted: false, student: { isDeleted: false } },
    orderBy: { student: { studentCode: "asc" } },
    select: {
      student: { select: { id: true, studentCode: true, prefix: true, firstName: true, lastName: true } },
    },
  });
  return enrollments.map((enrollment) => enrollment.student);
}

export async function findRecords(termId: string, date: Date, classroomIds?: string[]) {
  return prisma.dailyAttendance.findMany({
    where: {
      termId,
      date,
      isDeleted: false,
      ...(classroomIds ? { classroomId: { in: classroomIds } } : {}),
    },
    select: { classroomId: true, studentId: true, status: true },
  });
}

export async function findEnrolledRoster(termId: string, classroomIds: string[]) {
  return prisma.enrollment.findMany({
    where: { termId, classroomId: { in: classroomIds }, isDeleted: false, student: { isDeleted: false } },
    select: { classroomId: true, studentId: true },
  });
}

export async function findRecordsInRange(termId: string, start: Date, endExclusive: Date, classroomIds: string[]) {
  return prisma.dailyAttendance.findMany({
    where: { termId, classroomId: { in: classroomIds }, date: { gte: start, lt: endExclusive }, isDeleted: false },
    select: { date: true, classroomId: true, studentId: true, status: true },
  });
}

export async function upsertRecords(args: {
  termId: string;
  classroomId: string;
  date: Date;
  recordedById: string | null;
  entries: { studentId: string; status: DailyRollCallStatus }[];
}): Promise<void> {
  await prisma.$transaction(
    args.entries.map((entry) =>
      prisma.dailyAttendance.upsert({
        where: { termId_studentId_date: { termId: args.termId, studentId: entry.studentId, date: args.date } },
        update: {
          classroomId: args.classroomId,
          status: entry.status,
          recordedById: args.recordedById,
          isDeleted: false,
          deletedAt: null,
        },
        create: {
          termId: args.termId,
          classroomId: args.classroomId,
          studentId: entry.studentId,
          date: args.date,
          status: entry.status,
          recordedById: args.recordedById,
        },
      }),
    ),
  );
}

export async function findRecorderStaffId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { staffId: true } });
  return user?.staffId ?? null;
}
