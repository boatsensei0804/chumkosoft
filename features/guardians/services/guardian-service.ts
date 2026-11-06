import "server-only";

import * as repo from "@/features/guardians/repositories/guardian-repository";
import type { GuardianInput } from "@/features/guardians/schemas/guardian-schema";
import type { StudentGuardians, GuardianRow } from "@/features/guardians/types";
import type { LineLinkStatus } from "@/features/line/types";
import type { ActionResult } from "@/types/form";
import { paginate, DEFAULT_PAGE_SIZE, type Paginated } from "@/types/pagination";

function personName(s: { prefix: string | null; firstName: string; lastName: string }): string {
  return [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
}

function lineStatus(g: { lineUserId: string | null; lineLinkCode: string | null }): LineLinkStatus {
  if (g.lineUserId) return "linked";
  if (g.lineLinkCode) return "pending";
  return "unlinked";
}

export interface GuardianClassroomOption {
  id: string;
  code: string;
  gradeLevel: string;
}

/** Classrooms (active year) for the guardian/LINE page filter dropdowns. */
export async function listGuardianClassrooms(): Promise<GuardianClassroomOption[]> {
  return repo.listGuardianClassrooms();
}

/** Summary counts for the guardian / LINE page stat strips (respects the classroom filter). */
export async function getGuardianStats(params: { search: string; classroomId?: string }): Promise<{
  students: number;
  withGuardian: number;
  linked: number;
  pending: number;
}> {
  const [students, withGuardian, line] = await Promise.all([
    repo.countStudentsWithGuardians(params.search, params.classroomId),
    repo.countStudentsHavingGuardian(params.search, params.classroomId),
    repo.countGuardiansByLine(params.search, params.classroomId),
  ]);
  return { students, withGuardian, linked: line.linked, pending: line.pending };
}

/** Students (paged/searchable, optionally by classroom) with guardians + LINE status. */
export async function listStudentGuardians(params: { page: number; search: string; classroomId?: string }): Promise<Paginated<StudentGuardians>> {
  const pageSize = DEFAULT_PAGE_SIZE;
  const skip = (params.page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    repo.findStudentsWithGuardians({ skip, take: pageSize, search: params.search, classroomId: params.classroomId }),
    repo.countStudentsWithGuardians(params.search, params.classroomId),
  ]);

  const students: StudentGuardians[] = rows.map((s) => ({
    studentId: s.id,
    code: s.studentCode,
    name: personName(s),
    classroom: s.enrollments[0]?.classroom.code ?? "—",
    guardians: s.guardians.map(
      (g): GuardianRow => ({
        id: g.id,
        fullName: g.fullName,
        relation: g.relation,
        phone: g.phone,
        prefix: g.prefix,
        nationalId: g.nationalId,
        occupation: g.occupation,
        monthlyIncome: g.monthlyIncome,
        bloodType: g.bloodType,
        lineStatus: lineStatus(g),
        linkCode: g.lineUserId ? null : g.lineLinkCode,
      }),
    ),
  }));

  return paginate(students, total, params.page, pageSize);
}

export async function getClassroomGuardianPrintData(classroomId: string) {
  const rows = await repo.findClassroomGuardiansForPrint(classroomId);
  return rows.map((student) => ({
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: personName(student),
    classroom: student.enrollments[0]?.classroom.code ?? "—",
    guardians: student.guardians.map((guardian) => ({
      id: guardian.id,
      prefix: guardian.prefix,
      fullName: guardian.fullName,
      relation: guardian.relation,
      linked: guardian.lineUserId !== null,
      linkCode: guardian.lineUserId ? null : guardian.lineLinkCode,
    })),
  }));
}

export async function createGuardianRecord(studentId: string, input: GuardianInput): Promise<ActionResult> {
  if (!(await repo.studentExists(studentId))) {
    return { ok: false, message: "ไม่พบนักเรียน" };
  }
  await repo.createGuardian(studentId, input);
  return { ok: true, message: "เพิ่มผู้ปกครองเรียบร้อย" };
}

export async function updateGuardianRecord(id: string, input: GuardianInput): Promise<ActionResult> {
  const studentId = await repo.getGuardianStudentId(id);
  if (!studentId) return { ok: false, message: "ไม่พบผู้ปกครอง" };
  await repo.updateGuardian(id, input);
  return { ok: true, message: "บันทึกการแก้ไขเรียบร้อย" };
}

export async function deleteGuardianRecord(id: string): Promise<ActionResult> {
  const studentId = await repo.getGuardianStudentId(id);
  if (!studentId) return { ok: false, message: "ไม่พบผู้ปกครอง" };
  await repo.softDeleteGuardian(id);
  return { ok: true, message: "ลบผู้ปกครองเรียบร้อย" };
}
