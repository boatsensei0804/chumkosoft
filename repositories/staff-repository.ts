import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { StaffInput } from "@/features/teachers/schemas/staff-schema";

export type StaffFilter = "all" | "TEACHER" | "STAFF";

/** Columns returned for both the list and the detail view. */
const staffSelect = {
  id: true,
  staffCode: true,
  prefix: true,
  firstName: true,
  lastName: true,
  type: true,
  position: true,
  email: true,
  phone: true,
  birthDate: true,
  nationalId: true,
  positionNumber: true,
  salary: true,
  licenseNumber: true,
  licenseExpiry: true,
  degreeBachelor: true,
  fieldBachelor: true,
  universityBachelor: true,
  degreeMaster: true,
  fieldMaster: true,
  universityMaster: true,
  _count: {
    select: {
      offerings: { where: { isDeleted: false, term: { isActive: true, isDeleted: false } } },
    },
  },
} satisfies Prisma.StaffSelect;

function staffWhere(search: string, filter: StaffFilter): Prisma.StaffWhereInput {
  const q = search.trim();
  const typeFilter: Prisma.StaffWhereInput =
    filter === "TEACHER" ? { type: "TEACHER" } : filter === "STAFF" ? { type: { not: "TEACHER" } } : {};
  return {
    isDeleted: false,
    ...typeFilter,
    ...(q
      ? {
          OR: [
            { staffCode: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { position: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

/** Staff with the number of subjects they teach in the active term (paged). */
export async function findStaff(params: { skip: number; take: number; search: string; filter: StaffFilter }) {
  return prisma.staff.findMany({
    where: staffWhere(params.search, params.filter),
    orderBy: { staffCode: "asc" },
    skip: params.skip,
    take: params.take,
    select: staffSelect,
  });
}

/** Full staff record plus the active-term subjects they teach. */
export async function findStaffById(id: string) {
  return prisma.staff.findFirst({
    where: { id, isDeleted: false },
    select: {
      ...staffSelect,
      offerings: {
        where: { isDeleted: false, term: { isActive: true, isDeleted: false } },
        orderBy: { course: { code: "asc" } },
        select: {
          id: true,
          periodsPerWeek: true,
          course: { select: { code: true, name: true } },
          classroom: { select: { code: true } },
        },
      },
    },
  });
}

export async function countStaff(search: string, filter: StaffFilter): Promise<number> {
  return prisma.staff.count({ where: staffWhere(search, filter) });
}

export async function staffCodeExists(staffCode: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.staff.findFirst({
    where: { staffCode, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

/** National IDs must be unique among active staff (soft-deleted rows are ignored). */
export async function nationalIdExists(nationalId: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.staff.findFirst({
    where: { nationalId, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

export async function createStaff(data: StaffInput): Promise<{ id: string }> {
  return prisma.staff.create({ data, select: { id: true } });
}

export async function updateStaff(id: string, data: StaffInput): Promise<void> {
  await prisma.staff.update({ where: { id }, data });
}

/** Soft delete; frees the unique staffCode so it can be reused (see course repo note). */
export async function softDeleteStaff(id: string): Promise<void> {
  const row = await prisma.staff.findUnique({ where: { id }, select: { staffCode: true, isDeleted: true } });
  if (!row || row.isDeleted) return;
  await prisma.staff.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), staffCode: `${row.staffCode}::deleted::${id}` },
  });
}

/** A teacher assigned to teach in the active term cannot be deleted. */
export async function staffHasActiveOfferings(id: string): Promise<boolean> {
  const offering = await prisma.courseOffering.findFirst({
    where: { teacherId: id, isDeleted: false, term: { isActive: true, isDeleted: false } },
    select: { id: true },
  });
  return offering !== null;
}
