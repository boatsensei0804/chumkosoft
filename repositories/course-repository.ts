import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { CourseInput } from "@/features/courses/schemas/course-schema";

function courseWhere(search: string): Prisma.CourseWhereInput {
  const q = search.trim();
  return {
    isDeleted: false,
    ...(q
      ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
}

/** Courses with how many classes they are offered to in the active term (paged). */
export async function findCourses(params: { skip: number; take: number; search: string }) {
  return prisma.course.findMany({
    where: courseWhere(params.search),
    orderBy: { code: "asc" },
    skip: params.skip,
    take: params.take,
    select: {
      id: true,
      code: true,
      name: true,
      credits: true,
      description: true,
      _count: {
        select: {
          offerings: { where: { isDeleted: false, term: { isActive: true, isDeleted: false } } },
        },
      },
    },
  });
}

export async function countCourses(search: string): Promise<number> {
  return prisma.course.count({ where: courseWhere(search) });
}

/** Courses with at least one active-term offering — "เปิดสอนแล้ว" for the stat strip. */
export async function countCoursesWithActiveOfferings(): Promise<number> {
  return prisma.course.count({
    where: { isDeleted: false, offerings: { some: { isDeleted: false, term: { isActive: true, isDeleted: false } } } },
  });
}

/** Whether a course code is already taken (optionally ignoring one row for edits). */
export async function courseCodeExists(code: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.course.findFirst({
    where: { code, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

export async function createCourse(data: CourseInput): Promise<{ id: string }> {
  return prisma.course.create({ data, select: { id: true } });
}

export async function updateCourse(id: string, data: CourseInput): Promise<void> {
  await prisma.course.update({ where: { id }, data });
}

/**
 * Soft delete — mark inactive, never remove the row. The unique `code` is freed
 * (suffixed with the row id) so the same code can be reused by a new course; the
 * `@unique` constraint spans soft-deleted rows too, so it would otherwise block reuse.
 * Deleted rows are filtered out of every UI query, so the mangled code is never shown.
 */
export async function softDeleteCourse(id: string): Promise<void> {
  const row = await prisma.course.findUnique({ where: { id }, select: { code: true, isDeleted: true } });
  if (!row || row.isDeleted) return;
  await prisma.course.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), code: `${row.code}::deleted::${id}` },
  });
}

export async function courseHasActiveOfferings(id: string): Promise<boolean> {
  const offering = await prisma.courseOffering.findFirst({
    where: { courseId: id, isDeleted: false },
    select: { id: true },
  });
  return offering !== null;
}
