import {
  findStaff,
  findStaffById,
  countStaff,
  staffCodeExists,
  nationalIdExists,
  createStaff,
  updateStaff,
  softDeleteStaff,
  staffHasActiveOfferings,
  type StaffFilter,
} from "@/repositories/staff-repository";
import type { StaffInput } from "@/features/teachers/schemas/staff-schema";
import type { StaffKind, StaffSummary } from "@/features/teachers/types";
import type { ActionResult } from "@/types/form";
import { paginate, DEFAULT_PAGE_SIZE, type Paginated } from "@/types/pagination";

/** Date → `yyyy-mm-dd` so it can back a native <input type="date"> on the client. */
function toDateInput(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function toSummary(s: Awaited<ReturnType<typeof findStaff>>[number]): StaffSummary {
  return {
    id: s.id,
    code: s.staffCode,
    prefix: s.prefix,
    firstName: s.firstName,
    lastName: s.lastName,
    type: s.type as StaffKind,
    position: s.position,
    email: s.email,
    phone: s.phone,
    subjectsCount: s._count.offerings,
    birthDate: toDateInput(s.birthDate),
    nationalId: s.nationalId,
    positionNumber: s.positionNumber,
    salary: s.salary,
    licenseNumber: s.licenseNumber,
    licenseExpiry: toDateInput(s.licenseExpiry),
    degreeBachelor: s.degreeBachelor,
    fieldBachelor: s.fieldBachelor,
    universityBachelor: s.universityBachelor,
    degreeMaster: s.degreeMaster,
    fieldMaster: s.fieldMaster,
    universityMaster: s.universityMaster,
  };
}

export interface StaffTeaching {
  id: string;
  courseCode: string;
  courseName: string;
  classroomCode: string;
  periodsPerWeek: number;
}

export interface StaffDetail extends StaffSummary {
  teaching: StaffTeaching[];
}

export async function getStaffDetail(id: string): Promise<StaffDetail | null> {
  const s = await findStaffById(id);
  if (!s) return null;
  return {
    ...toSummary(s),
    teaching: s.offerings.map((o) => ({
      id: o.id,
      courseCode: o.course.code,
      courseName: o.course.name,
      classroomCode: o.classroom.code,
      periodsPerWeek: o.periodsPerWeek,
    })),
  };
}

/** Paginated, searchable, type-filtered staff list. */
export async function listStaffPaginated(params: { page: number; search: string; filter: StaffFilter }): Promise<Paginated<StaffSummary>> {
  const pageSize = DEFAULT_PAGE_SIZE;
  const skip = (params.page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    findStaff({ skip, take: pageSize, search: params.search, filter: params.filter }),
    countStaff(params.search, params.filter),
  ]);
  return paginate(rows.map(toSummary), total, params.page, pageSize);
}

/** Type breakdown for the page's stat strip. */
export async function getStaffStats(): Promise<{ total: number; teachers: number; personnel: number }> {
  const [total, teachers, personnel] = await Promise.all([
    countStaff("", "all"),
    countStaff("", "TEACHER"),
    countStaff("", "STAFF"),
  ]);
  return { total, teachers, personnel };
}

export async function createStaffRecord(input: StaffInput): Promise<ActionResult> {
  if (await staffCodeExists(input.staffCode)) {
    return { ok: false, fieldErrors: { staffCode: "รหัสบุคลากรนี้ถูกใช้แล้ว" } };
  }
  if (input.nationalId && (await nationalIdExists(input.nationalId))) {
    return { ok: false, fieldErrors: { nationalId: "เลขบัตรประชาชนนี้ถูกใช้แล้ว" } };
  }
  await createStaff(input);
  return { ok: true, message: "เพิ่มบุคลากรเรียบร้อย" };
}

export async function updateStaffRecord(id: string, input: StaffInput): Promise<ActionResult> {
  if (await staffCodeExists(input.staffCode, id)) {
    return { ok: false, fieldErrors: { staffCode: "รหัสบุคลากรนี้ถูกใช้แล้ว" } };
  }
  if (input.nationalId && (await nationalIdExists(input.nationalId, id))) {
    return { ok: false, fieldErrors: { nationalId: "เลขบัตรประชาชนนี้ถูกใช้แล้ว" } };
  }
  await updateStaff(id, input);
  return { ok: true, message: "บันทึกการแก้ไขเรียบร้อย" };
}

export async function deleteStaffRecord(id: string): Promise<ActionResult> {
  if (await staffHasActiveOfferings(id)) {
    return { ok: false, message: "ลบไม่ได้ เพราะบุคลากรนี้ยังมีคาบสอนในภาคเรียนปัจจุบัน" };
  }
  await softDeleteStaff(id);
  return { ok: true, message: "ลบบุคลากรเรียบร้อย" };
}
