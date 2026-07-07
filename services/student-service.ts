import type { EnrollmentStatus } from "@prisma/client";
import {
  findStudentsForActiveTerm,
  findStudentsPaginated,
  countStudentsFiltered,
  studentCodeExists,
  getActiveTermRef,
  findClassroomsForActiveYear,
  classroomExistsInYear,
  createStudent,
  updateStudent,
  softDeleteStudent,
} from "@/repositories/student-repository";
import { formatThaiDate } from "@/utils/thai-date";
import type { StudentInput, StudentCore } from "@/features/students/schemas/student-schema";
import type { EnrolmentStatus, StudentSummary, ClassroomOption } from "@/features/dashboard/types";
import type { ActionResult } from "@/types/form";
import { paginate, DEFAULT_PAGE_SIZE, type Paginated } from "@/types/pagination";

const statusMap: Record<string, EnrolmentStatus> = {
  ACTIVE: "active",
  PENDING: "pending",
  LEAVE: "leave",
};

const statusToPrisma: Record<EnrolmentStatus, EnrollmentStatus> = {
  active: "ACTIVE",
  pending: "PENDING",
  leave: "LEAVE",
};

function toIsoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function toSummary(s: Awaited<ReturnType<typeof findStudentsForActiveTerm>>[number]): StudentSummary {
  const enrollment = s.enrollments[0];
  return {
    id: s.id,
    code: s.studentCode,
    prefix: s.prefix,
    firstName: s.firstName,
    lastName: s.lastName,
    gender: s.gender,
    birthDate: toIsoDate(s.birthDate),
    classroom: enrollment?.classroom.code ?? "—",
    currentClassroomId: enrollment?.classroomId ?? null,
    grade: enrollment?.classroom.gradeLevel ?? "—",
    enrolledAt: enrollment ? formatThaiDate(enrollment.enrolledAt) : "—",
    status: enrollment ? statusMap[enrollment.status] : "active",
  };
}

/** Recent students for the dashboard overview (optionally limited). */
export async function listStudentSummaries(limit?: number): Promise<StudentSummary[]> {
  const rows = await findStudentsForActiveTerm(limit);
  return rows.map(toSummary);
}

/** Paginated, searchable, status-filtered student list. */
export async function listStudentsPaginated(params: {
  page: number;
  search: string;
  filter: "all" | EnrolmentStatus;
}): Promise<Paginated<StudentSummary>> {
  const pageSize = DEFAULT_PAGE_SIZE;
  const skip = (params.page - 1) * pageSize;
  const status = params.filter === "all" ? undefined : statusToPrisma[params.filter];
  const [rows, total] = await Promise.all([
    findStudentsPaginated({ skip, take: pageSize, search: params.search, status }),
    countStudentsFiltered(params.search, status),
  ]);
  return paginate(rows.map(toSummary), total, params.page, pageSize);
}

/** Classroom options (active academic year) for the placement dropdown. */
export async function listClassroomOptions(): Promise<ClassroomOption[]> {
  return findClassroomsForActiveYear();
}

function splitCore(input: StudentInput): StudentCore {
  return {
    studentCode: input.studentCode,
    prefix: input.prefix,
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender,
    birthDate: input.birthDate,
  };
}

/**
 * Resolves the requested classroom placement into a full Enrollment target, or
 * returns a field/summary error when placement is requested but cannot be made.
 */
async function resolvePlacement(
  classroomId: string | null,
): Promise<
  | { ok: true; placement: { termId: string; academicYearId: string; classroomId: string } | null }
  | { ok: false; error: ActionResult }
> {
  if (!classroomId) {
    return { ok: true, placement: null };
  }
  const termRef = await getActiveTermRef();
  if (!termRef) {
    return { ok: false, error: { ok: false, message: "ยังไม่ได้ตั้งค่าภาคเรียนที่ใช้งาน จึงกำหนดชั้นเรียนไม่ได้" } };
  }
  const valid = await classroomExistsInYear(classroomId, termRef.academicYearId);
  if (!valid) {
    return { ok: false, error: { ok: false, fieldErrors: { classroomId: "ไม่พบชั้นเรียนที่เลือก" } } };
  }
  return { ok: true, placement: { termId: termRef.termId, academicYearId: termRef.academicYearId, classroomId } };
}

export async function createStudentRecord(input: StudentInput): Promise<ActionResult> {
  if (await studentCodeExists(input.studentCode)) {
    return { ok: false, fieldErrors: { studentCode: "รหัสนักเรียนนี้ถูกใช้แล้ว" } };
  }
  const resolved = await resolvePlacement(input.classroomId);
  if (!resolved.ok) return resolved.error;

  await createStudent(splitCore(input), resolved.placement);
  return { ok: true, message: "เพิ่มนักเรียนเรียบร้อย" };
}

export async function updateStudentRecord(id: string, input: StudentInput): Promise<ActionResult> {
  if (await studentCodeExists(input.studentCode, id)) {
    return { ok: false, fieldErrors: { studentCode: "รหัสนักเรียนนี้ถูกใช้แล้ว" } };
  }
  const resolved = await resolvePlacement(input.classroomId);
  if (!resolved.ok) return resolved.error;

  await updateStudent(id, splitCore(input), resolved.placement);
  return { ok: true, message: "บันทึกการแก้ไขเรียบร้อย" };
}

export async function deleteStudentRecord(id: string): Promise<ActionResult> {
  await softDeleteStudent(id);
  return { ok: true, message: "ลบนักเรียนเรียบร้อย" };
}

export async function deleteStudentRecords(ids: string[]): Promise<ActionResult> {
  // Sequential so each soft delete resolves its unique-code suffix independently
  // and never races another delete for a colliding freed code.
  for (const id of ids) {
    await softDeleteStudent(id);
  }
  return { ok: true, message: `ลบนักเรียน ${ids.length} คนเรียบร้อย` };
}
