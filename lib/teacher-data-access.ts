import "server-only";

import prisma from "@/lib/prisma";
import type { CurrentUser } from "@/lib/dal";

/** A teacher may maintain records only for students in a current advisory room. */
export async function advisedStudentClassroomId(user: CurrentUser, studentId: string): Promise<string | null> {
  if (user.role !== "TEACHER" || !user.staffId) return null;
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      isDeleted: false,
      student: { isDeleted: false },
      term: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } },
      classroom: { isDeleted: false, advisors: { some: { staffId: user.staffId } } },
    },
    select: { classroomId: true },
  });
  return enrollment?.classroomId ?? null;
}

export async function advisoryClassroomIds(user: CurrentUser): Promise<string[]> {
  if (user.role !== "TEACHER" || !user.staffId) return [];
  const rooms = await prisma.classroomAdvisor.findMany({
    where: { staffId: user.staffId, classroom: { isDeleted: false, academicYear: { isActive: true, isDeleted: false } } },
    select: { classroomId: true },
  });
  return rooms.map((room) => room.classroomId);
}

export async function canEditAdvisedGuardian(user: CurrentUser, guardianId: string): Promise<boolean> {
  if (user.role !== "TEACHER") return false;
  const guardian = await prisma.guardian.findFirst({
    where: { id: guardianId, isDeleted: false },
    select: { studentId: true },
  });
  return Boolean(guardian && await advisedStudentClassroomId(user, guardian.studentId));
}
