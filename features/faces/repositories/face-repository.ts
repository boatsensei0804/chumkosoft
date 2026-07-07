import "server-only";

import prisma from "@/lib/prisma";

/** Students with their active-term classroom and enrolled face-photo count. */
export async function findStudentsWithFaceCounts() {
  const term = await prisma.term.findFirst({
    where: { isActive: true, isDeleted: false },
    select: { id: true },
  });

  return prisma.student.findMany({
    where: { isDeleted: false },
    orderBy: { studentCode: "asc" },
    select: {
      id: true,
      studentCode: true,
      prefix: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { isDeleted: false, ...(term ? { termId: term.id } : {}) },
        select: { classroom: { select: { code: true } } },
        take: 1,
      },
      _count: { select: { faceTemplates: { where: { isDeleted: false } } } },
    },
  });
}

export async function getStudentRef(studentId: string) {
  return prisma.student.findFirst({
    where: { id: studentId, isDeleted: false },
    select: { id: true, studentCode: true, prefix: true, firstName: true, lastName: true, faceConsent: true, faceConsentAt: true },
  });
}

export async function setFaceConsent(studentId: string, consent: boolean): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: { faceConsent: consent, faceConsentAt: consent ? new Date() : null },
  });
}

export async function findTemplates(studentId: string) {
  return prisma.faceTemplate.findMany({
    where: { studentId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, imageKey: true, createdAt: true },
  });
}

export async function createTemplate(args: { studentId: string; embedding: number[]; imageKey: string }): Promise<{ id: string }> {
  return prisma.faceTemplate.create({ data: args, select: { id: true } });
}

export async function getTemplateForRemoval(id: string) {
  return prisma.faceTemplate.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, studentId: true, imageKey: true },
  });
}

export async function softDeleteTemplate(id: string): Promise<void> {
  await prisma.faceTemplate.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
}

/** Active-term enrollments with each student's face-photo count, for the per-room view. */
export async function findEnrollmentsWithFaceCounts() {
  const term = await prisma.term.findFirst({
    where: { isActive: true, isDeleted: false },
    select: { id: true },
  });
  if (!term) return [];

  return prisma.enrollment.findMany({
    where: { termId: term.id, isDeleted: false, student: { isDeleted: false } },
    orderBy: [{ classroom: { code: "asc" } }, { student: { studentCode: "asc" } }],
    select: {
      classroom: { select: { id: true, code: true, gradeLevel: true } },
      student: {
        select: {
          id: true,
          studentCode: true,
          prefix: true,
          firstName: true,
          lastName: true,
          _count: { select: { faceTemplates: { where: { isDeleted: false } } } },
        },
      },
    },
  });
}

export interface FaceEnrollmentStats {
  totalStudents: number;
  enrolledStudents: number;
}

/** How many students have at least one face template — the /scan readiness stat. */
export async function getEnrollmentStats(): Promise<FaceEnrollmentStats> {
  const [totalStudents, enrolledStudents] = await Promise.all([
    prisma.student.count({ where: { isDeleted: false } }),
    prisma.student.count({
      where: { isDeleted: false, faceTemplates: { some: { isDeleted: false } } },
    }),
  ]);
  return { totalStudents, enrolledStudents };
}
