import prisma from "@/lib/prisma";
import type { DayOfWeek } from "@prisma/client";

/**
 * Resolve the board context. `termId`/`classroomId` come from the user's picks in
 * the context bar; when absent (or invalid) we fall back to the active term and the
 * first classroom of that term's academic year. Returns null only when the school
 * has no term or no classroom to work with at all.
 */
export async function resolveContext(opts?: { termId?: string; classroomId?: string }) {
  const term = opts?.termId
    ? await prisma.term.findFirst({
        where: { id: opts.termId, isDeleted: false },
        select: { id: true, name: true, academicYearId: true },
      })
    : await prisma.term.findFirst({
        where: { isActive: true, isDeleted: false },
        select: { id: true, name: true, academicYearId: true },
      });
  if (!term) return null;

  const classroom = opts?.classroomId
    ? await prisma.classroom.findFirst({
        where: { id: opts.classroomId, academicYearId: term.academicYearId, isDeleted: false },
        select: { id: true, code: true },
      })
    : await prisma.classroom.findFirst({
        where: { academicYearId: term.academicYearId, isDeleted: false },
        orderBy: { code: "asc" },
        select: { id: true, code: true },
      });
  if (!classroom) return null;

  return {
    termId: term.id,
    termName: term.name,
    academicYearId: term.academicYearId,
    classroomId: classroom.id,
    classroomCode: classroom.code,
  };
}

/** Backwards-compatible default context (active term + first classroom). */
export async function getActiveContext() {
  return resolveContext();
}

/** Terms available in the context-bar selector, newest academic year first. */
export async function listTermOptions() {
  return prisma.term.findMany({
    where: { isDeleted: false },
    orderBy: [{ academicYear: { buddhistYear: "desc" } }, { number: "asc" }],
    select: { id: true, name: true, isActive: true },
  });
}

/** Classrooms of a given academic year for the context-bar selector. */
export async function listClassroomOptions(academicYearId: string) {
  return prisma.classroom.findMany({
    where: { academicYearId, isDeleted: false },
    orderBy: { code: "asc" },
    select: { id: true, code: true, gradeLevel: true },
  });
}

/** All course offerings and placed timetable cells for the term, for read-only overviews. */
export async function getScheduleOverview(termId: string) {
  return prisma.courseOffering.findMany({
    where: { termId, isDeleted: false },
    orderBy: [{ classroom: { code: "asc" } }, { course: { code: "asc" } }],
    select: {
      id: true,
      periodsPerWeek: true,
      teacherId: true,
      roomId: true,
      classroomId: true,
      classroom: { select: { code: true, gradeLevel: true } },
      course: { select: { code: true, name: true } },
      teacher: { select: { prefix: true, firstName: true, lastName: true } },
      room: { select: { code: true, name: true, building: true } },
      timetableSlots: {
        where: { isDeleted: false },
        select: { id: true, dayOfWeek: true, periodId: true },
      },
    },
  });
}

export async function listScheduleClassrooms(academicYearId: string) {
  return prisma.classroom.findMany({
    where: { academicYearId, isDeleted: false },
    orderBy: { code: "asc" },
    select: { id: true, code: true, gradeLevel: true },
  });
}

/** The active class's lessons on a given weekday, ordered by period. */
export async function findSlotsForDay(dayOfWeek: DayOfWeek) {
  const ctx = await getActiveContext();
  if (!ctx) return { classroomCode: null, slots: [] as Awaited<ReturnType<typeof querySlots>> };
  const slots = await querySlots(ctx.termId, ctx.classroomId, dayOfWeek);
  return { classroomCode: ctx.classroomCode, slots };
}

function querySlots(termId: string, classroomId: string, dayOfWeek: DayOfWeek) {
  return prisma.timetableSlot.findMany({
    where: { termId, classroomId, dayOfWeek, isDeleted: false },
    orderBy: { period: { index: "asc" } },
    select: {
      id: true,
      period: { select: { label: true, startTime: true, endTime: true } },
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

export async function getPeriods() {
  return prisma.period.findMany({
    where: { isDeleted: false },
    orderBy: { index: "asc" },
    select: { id: true, index: true, label: true, startTime: true, endTime: true, isBreak: true },
  });
}

export async function getOfferings(termId: string, classroomId: string) {
  return prisma.courseOffering.findMany({
    where: { termId, classroomId, isDeleted: false },
    orderBy: { course: { code: "asc" } },
    select: {
      id: true,
      periodsPerWeek: true,
      teacherId: true,
      roomId: true,
      course: { select: { code: true, name: true } },
      teacher: { select: { prefix: true, firstName: true, lastName: true } },
      room: { select: { code: true, name: true, building: true } },
    },
  });
}

export async function getClassSlots(termId: string, classroomId: string) {
  return prisma.timetableSlot.findMany({
    where: { termId, classroomId, isDeleted: false },
    select: { id: true, courseOfferingId: true, dayOfWeek: true, periodId: true },
  });
}

/** Teacher/room occupancy from OTHER classes in the same term. */
export async function getExternalBusy(termId: string, classroomId: string) {
  return prisma.timetableSlot.findMany({
    where: { termId, isDeleted: false, classroomId: { not: classroomId } },
    select: { dayOfWeek: true, periodId: true, classroomId: true, teacherId: true, roomId: true },
  });
}

export async function getOfferingForPlacement(offeringId: string) {
  return prisma.courseOffering.findFirst({
    where: { id: offeringId, isDeleted: false },
    select: {
      id: true,
      termId: true,
      classroomId: true,
      teacherId: true,
      roomId: true,
      periodsPerWeek: true,
      course: { select: { name: true } },
      teacher: { select: { prefix: true, firstName: true, lastName: true } },
      room: { select: { code: true, name: true, building: true } },
      _count: { select: { timetableSlots: { where: { isDeleted: false } } } },
    },
  });
}

export async function getSlotWithOffering(slotId: string) {
  return prisma.timetableSlot.findFirst({
    where: { id: slotId, isDeleted: false },
    select: {
      id: true,
      courseOfferingId: true,
      teacherId: true,
      roomId: true,
      classroomId: true,
      termId: true,
      teacher: { select: { prefix: true, firstName: true, lastName: true } },
      room: { select: { code: true, name: true, building: true } },
    },
  });
}

/** Non-deleted slots occupying (day, period) that clash with the given teacher/room/class. */
export async function findCellConflicts(args: {
  termId: string;
  classroomId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: DayOfWeek;
  periodId: string;
  excludeSlotId?: string;
}) {
  return prisma.timetableSlot.findMany({
    where: {
      termId: args.termId,
      dayOfWeek: args.dayOfWeek,
      periodId: args.periodId,
      isDeleted: false,
      ...(args.excludeSlotId ? { id: { not: args.excludeSlotId } } : {}),
      OR: [
        { classroomId: args.classroomId },
        { teacherId: args.teacherId },
        { roomId: args.roomId },
      ],
    },
    select: { id: true, classroomId: true, teacherId: true, roomId: true },
  });
}

export async function createSlot(args: {
  termId: string;
  courseOfferingId: string;
  teacherId: string;
  classroomId: string;
  roomId: string;
  periodId: string;
  dayOfWeek: DayOfWeek;
}) {
  return prisma.timetableSlot.create({ data: args, select: { id: true } });
}

export async function updateSlotCell(slotId: string, dayOfWeek: DayOfWeek, periodId: string) {
  return prisma.timetableSlot.update({ where: { id: slotId }, data: { dayOfWeek, periodId }, select: { id: true } });
}

export async function softDeleteSlot(slotId: string) {
  return prisma.timetableSlot.update({ where: { id: slotId }, data: { isDeleted: true, deletedAt: new Date() }, select: { id: true } });
}
