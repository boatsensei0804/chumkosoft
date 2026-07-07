import "server-only";

import prisma from "@/lib/prisma";

export interface ScanTemplate {
  studentId: string;
  embedding: number[];
}

/**
 * Face templates eligible for matching: consented, non-deleted students who are
 * enrolled in the active term (so a match can always be recorded as a check-in).
 * Cached briefly to keep the ~1/second kiosk polling off the database hot path.
 */
let cache: { at: number; termId: string; templates: ScanTemplate[] } | null = null;
const CACHE_TTL_MS = 15_000;

export async function getActiveTermId(): Promise<string | null> {
  const term = await prisma.term.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true } });
  return term?.id ?? null;
}

export async function loadMatchableTemplates(termId: string): Promise<ScanTemplate[]> {
  const now = Date.now();
  if (cache && cache.termId === termId && now - cache.at < CACHE_TTL_MS) {
    return cache.templates;
  }

  const rows = await prisma.faceTemplate.findMany({
    where: {
      isDeleted: false,
      student: {
        isDeleted: false,
        faceConsent: true,
        enrollments: { some: { termId, isDeleted: false } },
      },
    },
    select: { studentId: true, embedding: true },
  });

  cache = { at: now, termId, templates: rows };
  return rows;
}

/** Invalidates the template cache (call after enrolment changes if needed). */
export function invalidateTemplateCache(): void {
  cache = null;
}

export async function getMatchedStudent(studentId: string, termId: string) {
  return prisma.student.findFirst({
    where: { id: studentId, isDeleted: false },
    select: {
      id: true,
      prefix: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { termId, isDeleted: false },
        select: { classroom: { select: { code: true } } },
        take: 1,
      },
    },
  });
}

/**
 * Records a FACE check-in for today, without overwriting an earlier check-in.
 * Returns whether the student was already checked in and the effective time.
 */
export async function recordFaceCheckIn(
  termId: string,
  studentId: string,
  date: Date,
  now: Date,
  isLate: boolean,
): Promise<{ alreadyCheckedIn: boolean; at: Date; isLate: boolean }> {
  const existing = await prisma.schoolEntry.findUnique({
    where: { studentId_date: { studentId, date } },
    select: { checkInAt: true, isLate: true, isDeleted: true },
  });

  if (existing && !existing.isDeleted && existing.checkInAt) {
    return { alreadyCheckedIn: true, at: existing.checkInAt, isLate: existing.isLate };
  }

  await prisma.schoolEntry.upsert({
    where: { studentId_date: { studentId, date } },
    update: { checkInAt: now, method: "FACE", isLate, isDeleted: false, deletedAt: null },
    create: { termId, studentId, date, checkInAt: now, method: "FACE", isLate },
  });
  return { alreadyCheckedIn: false, at: now, isLate };
}
