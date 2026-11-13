import "server-only";

import prisma from "@/lib/prisma";

/** LINE push targets (linked guardians) for a student. */
export async function findLineTargets(studentId: string): Promise<string[]> {
  const [guardians, studentAccounts] = await Promise.all([prisma.guardian.findMany({
    where: { studentId, isDeleted: false, lineUserId: { not: null } },
    select: { lineUserId: true },
  }), prisma.studentLineAccount.findMany({ where: { studentId, lineUserId: { not: null } }, select: { lineUserId: true } })]);
  return [...guardians, ...studentAccounts].flatMap((g) => (g.lineUserId ? [g.lineUserId] : []));
}

export async function createStudentLinkCode(studentId: string, code: string): Promise<void> {
  await prisma.studentLineAccount.create({ data: { studentId, lineLinkCode: code } });
}

export async function lineCodeExists(code: string): Promise<boolean> {
  const [guardian, studentAccount] = await Promise.all([
    prisma.guardian.findFirst({ where: { lineLinkCode: code }, select: { id: true } }),
    prisma.studentLineAccount.findFirst({ where: { lineLinkCode: code }, select: { id: true } }),
  ]);
  return Boolean(guardian || studentAccount);
}

export async function findStudentByLinkCode(code: string) {
  return prisma.studentLineAccount.findFirst({ where: { lineLinkCode: code }, select: { id: true, studentId: true, student: { select: { firstName: true, lastName: true, isDeleted: true } } } });
}

export async function linkStudentAccount(id: string, lineUserId: string): Promise<void> {
  await prisma.studentLineAccount.update({ where: { id }, data: { lineUserId, lineLinkCode: null } });
}

export async function setLinkCode(guardianId: string, code: string): Promise<void> {
  await prisma.guardian.update({ where: { id: guardianId }, data: { lineLinkCode: code } });
}

export async function findGuardianByLinkCode(code: string) {
  return prisma.guardian.findFirst({
    where: { lineLinkCode: code, isDeleted: false },
    select: { id: true, fullName: true, student: { select: { firstName: true, lastName: true } } },
  });
}

/** Completes linking: stores the LINE user id and clears the one-time code. */
export async function linkGuardian(guardianId: string, lineUserId: string): Promise<void> {
  await prisma.guardian.update({ where: { id: guardianId }, data: { lineUserId, lineLinkCode: null } });
}

export async function unlinkGuardian(guardianId: string): Promise<void> {
  await prisma.guardian.update({ where: { id: guardianId }, data: { lineUserId: null, lineLinkCode: null } });
}

export async function getGuardian(guardianId: string) {
  return prisma.guardian.findFirst({ where: { id: guardianId, isDeleted: false }, select: { id: true } });
}

