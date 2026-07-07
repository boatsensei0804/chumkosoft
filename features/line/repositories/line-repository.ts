import "server-only";

import prisma from "@/lib/prisma";

/** LINE push targets (linked guardians) for a student. */
export async function findLineTargets(studentId: string): Promise<string[]> {
  const guardians = await prisma.guardian.findMany({
    where: { studentId, isDeleted: false, lineUserId: { not: null } },
    select: { lineUserId: true },
  });
  return guardians.flatMap((g) => (g.lineUserId ? [g.lineUserId] : []));
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

