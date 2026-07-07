import type { EnrollmentStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { StudentCore } from "@/features/students/schemas/student-schema";

const studentColumns = {
  id: true,
  studentCode: true,
  prefix: true,
  firstName: true,
  lastName: true,
  gender: true,
  birthDate: true,
  nationalId: true,
  firstNameEn: true,
  lastNameEn: true,
  ethnicity: true,
  nationality: true,
  religion: true,
  bloodType: true,
  primaryLanguage: true,
  email: true,
  phone: true,
  birthHospital: true,
  birthTambon: true,
  birthAmphoe: true,
  birthProvince: true,
  previousSchool: true,
  studyPlan: true,
  weightKg: true,
  heightCm: true,
  chronicDisease: true,
  regHouseRegNo: true,
  regHouseNo: true,
  regMoo: true,
  regSoi: true,
  regRoad: true,
  regTambon: true,
  regAmphoe: true,
  regProvince: true,
  regPostalCode: true,
  curHouseRegNo: true,
  curHouseNo: true,
  curMoo: true,
  curSoi: true,
  curRoad: true,
  curTambon: true,
  curAmphoe: true,
  curProvince: true,
  curPostalCode: true,
  commuteMethod: true,
  commuteRoadType: true,
  commuteDistanceM: true,
  commuteMinutes: true,
  parentMaritalStatus: true,
  siblingsOlderBrothers: true,
  siblingsOlderSisters: true,
  siblingsYoungerBrothers: true,
  siblingsYoungerSisters: true,
  birthOrder: true,
  dependantsCount: true,
  disadvantages: true,
  shortages: true,
  disabilities: true,
} satisfies Prisma.StudentSelect;

function studentSelect(termId: string | undefined) {
  return {
    ...studentColumns,
    enrollments: {
      where: { isDeleted: false, ...(termId ? { termId } : {}) },
      select: {
        status: true,
        enrolledAt: true,
        classroomId: true,
        classroom: { select: { code: true, gradeLevel: true } },
      },
      orderBy: { enrolledAt: "desc" as const },
      take: 1,
    },
  } satisfies Prisma.StudentSelect;
}

/** Full student record + guardians + latest enrollment (for the detail page & edit). */
export async function findStudentById(id: string) {
  return prisma.student.findFirst({
    where: { id, isDeleted: false },
    select: {
      ...studentSelect(await activeTermId()),
      faceConsent: true,
      guardians: {
        where: { isDeleted: false },
        select: {
          id: true,
          fullName: true,
          relation: true,
          prefix: true,
          nationalId: true,
          occupation: true,
          monthlyIncome: true,
          bloodType: true,
          phone: true,
          lineUserId: true,
        },
      },
    },
  });
}

async function activeTermId(): Promise<string | undefined> {
  const term = await prisma.term.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true } });
  return term?.id;
}

/** Recent students with active-term placement (for the dashboard overview). */
export async function findStudentsForActiveTerm(limit?: number) {
  const termId = await activeTermId();
  return prisma.student.findMany({
    where: { isDeleted: false },
    select: studentSelect(termId),
    orderBy: { studentCode: "desc" },
    ...(limit ? { take: limit } : {}),
  });
}

function studentWhere(search: string, status: EnrollmentStatus | undefined, termId: string | undefined): Prisma.StudentWhereInput {
  const q = search.trim();
  return {
    isDeleted: false,
    ...(q
      ? {
          OR: [
            { studentCode: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status && termId ? { enrollments: { some: { termId, status, isDeleted: false } } } : {}),
  };
}

/** Paginated, searchable, status-filtered student list scoped to the active term. */
export async function findStudentsPaginated(params: { skip: number; take: number; search: string; status: EnrollmentStatus | undefined }) {
  const termId = await activeTermId();
  return prisma.student.findMany({
    where: studentWhere(params.search, params.status, termId),
    select: studentSelect(termId),
    orderBy: { studentCode: "desc" },
    skip: params.skip,
    take: params.take,
  });
}

export async function countStudentsFiltered(search: string, status: EnrollmentStatus | undefined): Promise<number> {
  const termId = await activeTermId();
  return prisma.student.count({ where: studentWhere(search, status, termId) });
}

export async function countStudents(): Promise<number> {
  return prisma.student.count({ where: { isDeleted: false } });
}

export async function studentCodeExists(studentCode: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.student.findFirst({
    where: { studentCode, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

export interface ActiveTermRef {
  termId: string;
  academicYearId: string;
}

/** The active term with its academic year, needed to write an Enrollment. */
export async function getActiveTermRef(): Promise<ActiveTermRef | null> {
  const term = await prisma.term.findFirst({
    where: { isActive: true, isDeleted: false },
    select: { id: true, academicYearId: true },
  });
  return term ? { termId: term.id, academicYearId: term.academicYearId } : null;
}

/** Classrooms in the active academic year, for the placement dropdown. */
export async function findClassroomsForActiveYear() {
  return prisma.classroom.findMany({
    where: { isDeleted: false, academicYear: { isActive: true, isDeleted: false } },
    orderBy: { code: "asc" },
    select: { id: true, code: true, gradeLevel: true },
  });
}

export async function classroomExistsInYear(classroomId: string, academicYearId: string): Promise<boolean> {
  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, academicYearId, isDeleted: false },
    select: { id: true },
  });
  return classroom !== null;
}

interface Placement {
  termId: string;
  academicYearId: string;
  classroomId: string;
}

/** Creates a student and, when a placement is given, its enrollment — atomically. */
export async function createStudent(data: StudentCore, placement: Placement | null): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.create({ data, select: { id: true } });
    if (placement) {
      await tx.enrollment.create({
        data: {
          studentId: student.id,
          classroomId: placement.classroomId,
          academicYearId: placement.academicYearId,
          termId: placement.termId,
        },
      });
    }
    return student;
  });
}

/** Updates student columns and, when a placement is given, upserts the term enrollment. */
export async function updateStudent(id: string, data: StudentCore, placement: Placement | null): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.student.update({ where: { id }, data });
    if (placement) {
      await tx.enrollment.upsert({
        where: { studentId_termId: { studentId: id, termId: placement.termId } },
        update: { classroomId: placement.classroomId, academicYearId: placement.academicYearId, isDeleted: false, deletedAt: null },
        create: {
          studentId: id,
          classroomId: placement.classroomId,
          academicYearId: placement.academicYearId,
          termId: placement.termId,
        },
      });
    }
  });
}

/** Soft delete; frees the unique studentCode so it can be reused (see course repo note). */
export async function softDeleteStudent(id: string): Promise<void> {
  const row = await prisma.student.findUnique({ where: { id }, select: { studentCode: true, isDeleted: true } });
  if (!row || row.isDeleted) return;
  await prisma.student.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), studentCode: `${row.studentCode}::deleted::${id}` },
  });
}
