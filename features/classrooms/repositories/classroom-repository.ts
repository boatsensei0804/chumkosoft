import "server-only";

import prisma from "@/lib/prisma";
import type { ClassroomInput } from "@/features/classrooms/schemas/classroom-schema";

export async function getActiveYearId(): Promise<string | null> {
  const year = await prisma.academicYear.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true } });
  return year?.id ?? null;
}

export async function getActiveTermId(): Promise<string | null> {
  const term = await prisma.term.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true } });
  return term?.id ?? null;
}

/** Classrooms in the active year with homeroom teacher + roster/offering counts (active term). */
export async function listClassrooms(yearId: string, termId: string | null) {
  const termFilter = termId ? { termId } : { termId: "__none__" };
  return prisma.classroom.findMany({
    where: { academicYearId: yearId, isDeleted: false },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      gradeLevel: true,
      advisors: { select: { staffId: true, staff: { select: { prefix: true, firstName: true, lastName: true } } } },
      _count: {
        select: {
          enrollments: { where: { isDeleted: false, ...termFilter } },
          offerings: { where: { isDeleted: false, ...termFilter } },
        },
      },
    },
  });
}

export async function getClassroom(id: string) {
  return prisma.classroom.findFirst({
    where: { id, isDeleted: false },
    select: {
      id: true,
      code: true,
      gradeLevel: true,
      academicYearId: true,
      advisors: {
        orderBy: { assignedAt: "asc" },
        select: { staffId: true, staff: { select: { prefix: true, firstName: true, lastName: true, position: true } } },
      },
    },
  });
}

export async function classroomCodeExists(yearId: string, code: string, excludeId?: string): Promise<boolean> {
  const row = await prisma.classroom.findFirst({
    where: { academicYearId: yearId, code, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}

export async function staffExists(id: string): Promise<boolean> {
  const row = await prisma.staff.findFirst({ where: { id, isDeleted: false }, select: { id: true } });
  return row !== null;
}

/** True only when every id is an existing, non-deleted staff member. */
export async function allStaffExist(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const count = await prisma.staff.count({ where: { id: { in: ids }, isDeleted: false } });
  return count === ids.length;
}

export async function createClassroom(yearId: string, data: ClassroomInput): Promise<{ id: string }> {
  return prisma.classroom.create({
    data: {
      academicYearId: yearId,
      code: data.code,
      gradeLevel: data.gradeLevel,
      advisors: { create: data.advisorIds.map((staffId) => ({ staffId })) },
    },
    select: { id: true },
  });
}

export async function updateClassroom(id: string, data: ClassroomInput): Promise<void> {
  // Replace the advisor set wholesale — simplest correct approach for a small list.
  await prisma.classroom.update({
    where: { id },
    data: {
      code: data.code,
      gradeLevel: data.gradeLevel,
      advisors: { deleteMany: {}, create: data.advisorIds.map((staffId) => ({ staffId })) },
    },
  });
}

/** Blocks delete when the classroom still has active-term students or subjects. */
export async function classroomInUse(id: string, termId: string | null): Promise<boolean> {
  const termFilter = termId ? { termId } : {};
  const enrollment = await prisma.enrollment.findFirst({ where: { classroomId: id, isDeleted: false, ...termFilter }, select: { id: true } });
  if (enrollment) return true;
  const offering = await prisma.courseOffering.findFirst({ where: { classroomId: id, isDeleted: false, ...termFilter }, select: { id: true } });
  return offering !== null;
}

/** Soft delete; frees the (year, code) unique so the code can be reused. */
export async function softDeleteClassroom(id: string): Promise<void> {
  const row = await prisma.classroom.findUnique({ where: { id }, select: { code: true, isDeleted: true } });
  if (!row || row.isDeleted) return;
  await prisma.classroom.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), code: `${row.code}::deleted::${id}` },
  });
}

// ── Teacher options (homeroom teacher select) ────────────────────────────────

export async function findTeacherOptions() {
  return prisma.staff.findMany({
    where: { isDeleted: false, type: "TEACHER" },
    orderBy: { staffCode: "asc" },
    select: { id: true, prefix: true, firstName: true, lastName: true },
  });
}

// ── Classroom detail: roster + offerings ─────────────────────────────────────

export async function findRoster(classroomId: string, termId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { classroomId, termId, isDeleted: false, student: { isDeleted: false } },
    orderBy: { student: { studentCode: "asc" } },
    select: {
      status: true,
      student: { select: { id: true, studentCode: true, prefix: true, firstName: true, lastName: true } },
    },
  });
  return enrollments.map((e) => ({ ...e.student, status: e.status }));
}

export async function findOfferings(classroomId: string, termId: string) {
  return prisma.courseOffering.findMany({
    where: { classroomId, termId, isDeleted: false },
    orderBy: { course: { code: "asc" } },
    select: {
      id: true,
      periodsPerWeek: true,
      course: { select: { code: true, name: true } },
      teacher: { select: { prefix: true, firstName: true, lastName: true } },
      room: { select: { code: true, name: true } },
    },
  });
}

// ── Course offering management (classroom ↔ course ↔ teacher ↔ room) ──────────

export async function findCourseOptions() {
  return prisma.course.findMany({
    where: { isDeleted: false },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });
}

export async function findRoomOptions() {
  return prisma.room.findMany({
    where: { isDeleted: false },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });
}

/** True when the term exists (not deleted) and belongs to the given academic year. */
export async function termInYear(termId: string, academicYearId: string): Promise<boolean> {
  const term = await prisma.term.findFirst({
    where: { id: termId, academicYearId, isDeleted: false },
    select: { id: true },
  });
  return term !== null;
}

export async function offeringExists(termId: string, courseId: string, classroomId: string): Promise<boolean> {
  const row = await prisma.courseOffering.findFirst({
    where: { termId, courseId, classroomId, isDeleted: false },
    select: { id: true },
  });
  return row !== null;
}

export async function createOffering(data: {
  termId: string;
  courseId: string;
  teacherId: string;
  classroomId: string;
  roomId: string;
  periodsPerWeek: number;
}): Promise<{ id: string }> {
  return prisma.courseOffering.create({ data, select: { id: true } });
}

export async function getOfferingRef(id: string) {
  return prisma.courseOffering.findFirst({ where: { id, isDeleted: false }, select: { id: true, classroomId: true } });
}

/** A subject already scheduled in the timetable cannot be removed from the class. */
export async function offeringHasSlots(id: string): Promise<boolean> {
  const slot = await prisma.timetableSlot.findFirst({ where: { courseOfferingId: id, isDeleted: false }, select: { id: true } });
  return slot !== null;
}

export async function softDeleteOffering(id: string): Promise<void> {
  await prisma.courseOffering.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
}

/**
 * Soft-deletes an offering together with any timetable slots it was placed into,
 * in one transaction. Returns how many placed slots were removed (for messaging).
 */
export async function softDeleteOfferingWithSlots(id: string): Promise<number> {
  const now = new Date();
  const [slotResult] = await prisma.$transaction([
    prisma.timetableSlot.updateMany({ where: { courseOfferingId: id, isDeleted: false }, data: { isDeleted: true, deletedAt: now } }),
    prisma.courseOffering.update({ where: { id }, data: { isDeleted: true, deletedAt: now } }),
  ]);
  return slotResult.count;
}

export async function referenceExists(model: "course" | "room", id: string): Promise<boolean> {
  if (model === "course") {
    return (await prisma.course.findFirst({ where: { id, isDeleted: false }, select: { id: true } })) !== null;
  }
  return (await prisma.room.findFirst({ where: { id, isDeleted: false }, select: { id: true } })) !== null;
}
