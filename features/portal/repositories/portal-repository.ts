import "server-only";

import type { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface PortalStudent {
  id: string;
  prefix: string | null;
  firstName: string;
  lastName: string;
}

/**
 * Resolves the student a portal viewer is looking at: a STUDENT account maps to
 * its own linked record; a PARENT account maps to the first student they guard.
 */
export async function resolvePortalStudent(userId: string, role: Role): Promise<PortalStudent | null> {
  if (role === "STUDENT") {
    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: { student: { select: { id: true, prefix: true, firstName: true, lastName: true } } },
    });
    return user?.student ?? null;
  }

  if (role === "PARENT") {
    const guardian = await prisma.guardian.findFirst({
      where: { userId, isDeleted: false, student: { isDeleted: false } },
      orderBy: { createdAt: "asc" },
      select: { student: { select: { id: true, prefix: true, firstName: true, lastName: true } } },
    });
    return guardian?.student ?? null;
  }

  return null;
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
