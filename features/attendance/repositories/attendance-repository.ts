import "server-only";

import type { AttendanceStatus, DayOfWeek } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface ActiveTermRef {
  termId: string;
}

export async function getActiveTerm(): Promise<{ id: string } | null> {
  return prisma.term.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true } });
}

/** Course offerings in the active term, for the roll-call class picker. */
export async function findOfferingsForTerm(termId: string) {
  return prisma.courseOffering.findMany({
    where: { termId, isDeleted: false },
    orderBy: [{ classroom: { code: "asc" } }, { course: { code: "asc" } }],
    select: {
      id: true,
      classroomId: true,
      course: { select: { name: true } },
      classroom: { select: { code: true } },
    },
  });
}

/** The period an offering meets on a given weekday, if scheduled (first slot). */
export async function findMeetingPeriod(offeringId: string, dayOfWeek: DayOfWeek) {
  return prisma.timetableSlot.findFirst({
    where: { courseOfferingId: offeringId, dayOfWeek, isDeleted: false },
    orderBy: { period: { index: "asc" } },
    select: { periodId: true, period: { select: { label: true, startTime: true, endTime: true } } },
  });
}

/** Any period for an offering (fallback when it is not scheduled on the chosen day). */
export async function findAnyPeriod(offeringId: string) {
  return prisma.timetableSlot.findFirst({
    where: { courseOfferingId: offeringId, isDeleted: false },
    orderBy: { period: { index: "asc" } },
    select: { periodId: true, period: { select: { label: true } } },
  });
}

export async function getOfferingRef(offeringId: string) {
  return prisma.courseOffering.findFirst({
    where: { id: offeringId, isDeleted: false },
    select: { id: true, termId: true, classroomId: true },
  });
}

/** Students enrolled in a classroom for a term, ordered by student code. */
export async function findEnrolledStudents(classroomId: string, termId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { classroomId, termId, isDeleted: false, student: { isDeleted: false } },
    orderBy: { student: { studentCode: "asc" } },
    select: {
      student: { select: { id: true, studentCode: true, prefix: true, firstName: true, lastName: true } },
    },
  });
  return enrollments.map((e) => e.student);
}

/** Existing roll-call records for an offering on a date, keyed by student. */
export async function findAttendance(offeringId: string, date: Date) {
  return prisma.classAttendance.findMany({
    where: { courseOfferingId: offeringId, date, isDeleted: false },
    select: { studentId: true, status: true, note: true },
  });
}

export async function getStaffIdForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { staffId: true } });
  return user?.staffId ?? null;
}

export interface AttendanceWrite {
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
}

/** Upserts every roster entry for (offering, date) in one transaction. */
export async function upsertAttendance(
  args: { termId: string; offeringId: string; periodId: string; date: Date; recordedById: string | null },
  entries: AttendanceWrite[],
): Promise<void> {
  await prisma.$transaction(
    entries.map((e) =>
      prisma.classAttendance.upsert({
        where: { courseOfferingId_studentId_date: { courseOfferingId: args.offeringId, studentId: e.studentId, date: args.date } },
        update: { status: e.status, note: e.note, periodId: args.periodId, recordedById: args.recordedById, isDeleted: false, deletedAt: null },
        create: {
          termId: args.termId,
          courseOfferingId: args.offeringId,
          studentId: e.studentId,
          periodId: args.periodId,
          date: args.date,
          status: e.status,
          note: e.note,
          recordedById: args.recordedById,
        },
      }),
    ),
  );
}
