import "server-only";

import type { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface PortalStudent {
  id: string;
  prefix: string | null;
  firstName: string;
  lastName: string;
}

export async function listPortalStudents(userId: string, role: Role): Promise<PortalStudent[]> {
  const studentFields = { id: true, prefix: true, firstName: true, lastName: true } as const;
  if (role === "STUDENT") {
    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false, student: { isDeleted: false } },
      select: { student: { select: studentFields } },
    });
    return user?.student ? [user.student] : [];
  }

  if (role === "PARENT") {
    const guardians = await prisma.guardian.findMany({
      where: { userId, isDeleted: false, student: { isDeleted: false } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { student: { select: studentFields } },
    });
    const students = new Map(guardians.map(({ student }) => [student.id, student]));
    return [...students.values()];
  }

  return [];
}

export async function findPortalEntries(termId: string, studentId: string, date: Date) {
  return prisma.schoolEntry.findFirst({
    where: { termId, studentId, date, isDeleted: false },
    select: { checkInAt: true, checkOutAt: true, isLate: true },
  });
}

export interface PortalPlacement {
  termId: string;
  termName: string;
  classroomId: string;
  classroomCode: string;
  gradeLevel: string;
}

/** The student's placement in the active term, or null if not enrolled/no term. */
export async function findActivePlacement(studentId: string): Promise<PortalPlacement | null> {
  const term = await prisma.term.findFirst({
    where: { isActive: true, isDeleted: false },
    select: { id: true, name: true },
  });
  if (!term) return null;

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, termId: term.id, isDeleted: false },
    select: { classroom: { select: { id: true, code: true, gradeLevel: true } } },
  });
  if (!enrollment) return null;

  return {
    termId: term.id,
    termName: term.name,
    classroomId: enrollment.classroom.id,
    classroomCode: enrollment.classroom.code,
    gradeLevel: enrollment.classroom.gradeLevel,
  };
}

/** Every lesson for a classroom in a term, with period/course/teacher/room. */
export async function findWeeklySlots(termId: string, classroomId: string) {
  return prisma.timetableSlot.findMany({
    where: { termId, classroomId, isDeleted: false },
    select: {
      dayOfWeek: true,
      periodId: true,
      courseOffering: {
        select: {
          course: { select: { name: true } },
          teacher: { select: { prefix: true, firstName: true, lastName: true } },
          room: { select: { code: true, name: true, building: true } },
        },
      },
    },
  });
}
