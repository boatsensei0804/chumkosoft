import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { GuardianInput } from "@/features/guardians/schemas/guardian-schema";

export type StudentLineFilter = "linked" | "pending" | "unprepared";

const linkedLine: Prisma.StudentWhereInput = {
  OR: [
    { guardians: { some: { isDeleted: false, lineUserId: { not: null } } } },
    { lineAccounts: { some: { lineUserId: { not: null } } } },
  ],
};
const pendingLineCode: Prisma.StudentWhereInput = {
  OR: [
    { guardians: { some: { isDeleted: false, lineUserId: null, lineLinkCode: { not: null } } } },
    { lineAccounts: { some: { lineUserId: null, lineLinkCode: { not: null } } } },
  ],
};

function withLineFilter(student: Prisma.StudentWhereInput, filter?: StudentLineFilter): Prisma.StudentWhereInput {
  if (filter === "linked") return { AND: [student, linkedLine] };
  if (filter === "pending") return { AND: [student, { NOT: linkedLine }, pendingLineCode] };
  if (filter === "unprepared") return { AND: [student, { NOT: linkedLine }, { NOT: pendingLineCode }] };
  return student;
}

async function activeTermId(): Promise<string | undefined> {
  const term = await prisma.term.findFirst({ where: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } }, select: { id: true } });
  return term?.id;
}

function studentWhere(search: string, classroomId: string | undefined, termId: string | undefined, currentTermOnly = false): Prisma.StudentWhereInput {
  const q = search.trim();
  return {
    isDeleted: false,
    ...(currentTermOnly && !termId ? { id: "__no_active_term__" } : {}),
    ...(classroomId ? { enrollments: { some: { classroomId, isDeleted: false, ...(termId ? { termId } : {}) } } } : {}),
    ...(currentTermOnly && !classroomId && termId ? { enrollments: { some: { termId, isDeleted: false } } } : {}),
    ...(q
      ? {
          OR: [
            { studentCode: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

/** Classrooms of the active academic year for the guardian/LINE page filters. */
export async function listGuardianClassrooms() {
  const year = await prisma.academicYear.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true } });
  if (!year) return [];
  return prisma.classroom.findMany({
    where: { academicYearId: year.id, isDeleted: false },
    orderBy: { code: "asc" },
    select: { id: true, code: true, gradeLevel: true },
  });
}

/** Students (paged) with their guardians — includes students with none yet. */
export async function findStudentsWithGuardians(params: { skip: number; take: number; search: string; classroomId?: string; lineFilter?: StudentLineFilter; currentTermOnly?: boolean }) {
  const termId = await activeTermId();
  return prisma.student.findMany({
    where: withLineFilter(studentWhere(params.search, params.classroomId, termId, params.currentTermOnly), params.lineFilter),
    orderBy: { studentCode: "asc" },
    skip: params.skip,
    take: params.take,
    select: {
      id: true,
      studentCode: true,
      prefix: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { isDeleted: false, ...(termId ? { termId } : {}) },
        orderBy: { enrolledAt: "desc" },
        take: 1,
        select: { classroom: { select: { code: true } } },
      },
      guardians: {
        where: { isDeleted: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fullName: true,
          relation: true,
          phone: true,
          prefix: true,
          nationalId: true,
          occupation: true,
          monthlyIncome: true,
          bloodType: true,
          lineUserId: true,
          lineLinkCode: true,
        },
      },
      lineAccounts: { orderBy: { createdAt: "asc" }, select: { id: true, lineUserId: true, lineLinkCode: true } },
    },
  });
}

export async function countStudentsWithGuardians(search: string, classroomId?: string, lineFilter?: StudentLineFilter, currentTermOnly = false): Promise<number> {
  const termId = await activeTermId();
  return prisma.student.count({ where: withLineFilter(studentWhere(search, classroomId, termId, currentTermOnly), lineFilter) });
}

/** Students (in scope) that have at least one guardian on record. */
export async function countStudentsHavingGuardian(search: string, classroomId?: string): Promise<number> {
  const termId = await activeTermId();
  return prisma.student.count({ where: { ...studentWhere(search, classroomId, termId), guardians: { some: { isDeleted: false } } } });
}

/** Guardian LINE-link counts (in scope): fully linked vs. pending a one-time code. */
export async function countGuardiansByLine(search: string, classroomId?: string): Promise<{ linked: number; pending: number }> {
  const termId = await activeTermId();
  const student = studentWhere(search, classroomId, termId);
  const [linked, pending] = await Promise.all([
    prisma.guardian.count({ where: { isDeleted: false, lineUserId: { not: null }, student } }),
    prisma.guardian.count({ where: { isDeleted: false, lineUserId: null, lineLinkCode: { not: null }, student } }),
  ]);
  return { linked, pending };
}

/** Count students once, regardless of how many guardian/LINE records they have. */
export async function countStudentsByLine(search: string, classroomId?: string, currentTermOnly = false): Promise<{ total: number; linked: number; pending: number }> {
  const termId = await activeTermId();
  const student = studentWhere(search, classroomId, termId, currentTermOnly);
  const [total, linkedCount, pending] = await Promise.all([
    prisma.student.count({ where: student }),
    prisma.student.count({ where: withLineFilter(student, "linked") }),
    prisma.student.count({ where: withLineFilter(student, "pending") }),
  ]);
  return { total, linked: linkedCount, pending };
}

export async function listClassroomLineStats(): Promise<{ id: string; code: string; total: number; linked: number; pending: number; unprepared: number }[]> {
  const [classrooms, termId] = await Promise.all([listGuardianClassrooms(), activeTermId()]);
  const stats = new Map(classrooms.map((room) => [room.id, { id: room.id, code: room.code, total: 0, linked: 0, pending: 0, unprepared: 0 }]));
  if (!termId || classrooms.length === 0) return [...stats.values()];
  const enrollments = await prisma.enrollment.findMany({
    where: { termId, isDeleted: false, classroomId: { in: classrooms.map((room) => room.id) }, student: { isDeleted: false } },
    select: {
      classroomId: true,
      student: { select: {
        guardians: { where: { isDeleted: false }, select: { lineUserId: true, lineLinkCode: true } },
        lineAccounts: { select: { lineUserId: true, lineLinkCode: true } },
      } },
    },
  });
  for (const enrollment of enrollments) {
    const room = stats.get(enrollment.classroomId);
    if (!room) continue;
    room.total += 1;
    const accounts = [...enrollment.student.guardians, ...enrollment.student.lineAccounts];
    if (accounts.some((account) => account.lineUserId)) room.linked += 1;
    else if (accounts.some((account) => account.lineLinkCode)) room.pending += 1;
    else room.unprepared += 1;
  }
  return [...stats.values()];
}

/** Full classroom guardian roster for batch LINE setup and printable handouts. */
export async function findClassroomGuardiansForPrint(classroomId: string) {
  const termId = await activeTermId();
  if (!termId) return [];
  return prisma.student.findMany({
    where: {
      isDeleted: false,
      enrollments: { some: { classroomId, termId, isDeleted: false } },
    },
    orderBy: { studentCode: "asc" },
    select: {
      id: true,
      studentCode: true,
      prefix: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { classroomId, termId, isDeleted: false },
        take: 1,
        select: { classroom: { select: { code: true } } },
      },
      guardians: {
        where: { isDeleted: false },
        orderBy: { createdAt: "asc" },
        select: { id: true, prefix: true, fullName: true, relation: true, lineUserId: true, lineLinkCode: true },
      },
      lineAccounts: { orderBy: { createdAt: "asc" }, select: { id: true, lineUserId: true, lineLinkCode: true } },
    },
  });
}

/** Add codes only to guardians who are not linked and do not already have a pending code. */
export async function updateMissingGuardianLinkCodes(rows: { id: string; code: string }[]): Promise<number> {
  if (rows.length === 0) return 0;
  const results = await prisma.$transaction(rows.map(({ id, code }) => prisma.guardian.updateMany({
    where: { id, isDeleted: false, lineUserId: null, lineLinkCode: null },
    data: { lineLinkCode: code },
  })));
  return results.reduce((count, result) => count + result.count, 0);
}

export async function studentExists(id: string): Promise<boolean> {
  return (await prisma.student.findFirst({ where: { id, isDeleted: false }, select: { id: true } })) !== null;
}

export async function getStudentIdentity(id: string) {
  return prisma.student.findFirst({ where: { id, isDeleted: false }, select: { id: true, firstName: true, lastName: true } });
}

export async function createGuardian(studentId: string, data: GuardianInput): Promise<{ id: string }> {
  return prisma.guardian.create({
    data: {
      studentId,
      fullName: data.fullName,
      relation: data.relation,
      phone: data.phone,
      prefix: data.prefix,
      nationalId: data.nationalId,
      occupation: data.occupation,
      monthlyIncome: data.monthlyIncome,
      bloodType: data.bloodType,
    },
    select: { id: true },
  });
}

export async function updateGuardian(id: string, data: GuardianInput): Promise<void> {
  await prisma.guardian.update({
    where: { id },
    data: {
      fullName: data.fullName,
      relation: data.relation,
      phone: data.phone,
      prefix: data.prefix,
      nationalId: data.nationalId,
      occupation: data.occupation,
      monthlyIncome: data.monthlyIncome,
      bloodType: data.bloodType,
    },
  });
}

export async function softDeleteGuardian(id: string): Promise<void> {
  await prisma.guardian.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
}

export async function getGuardianStudentId(id: string): Promise<string | null> {
  const g = await prisma.guardian.findFirst({ where: { id, isDeleted: false }, select: { studentId: true } });
  return g?.studentId ?? null;
}
