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

/** Students (paged/searchable) with their guardians + LINE status, for the manager. */
export async function listStudentGuardians(params: { page: number; search: string }): Promise<Paginated<StudentGuardians>> {
  const pageSize = DEFAULT_PAGE_SIZE;
  const skip = (params.page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    repo.findStudentsWithGuardians({ skip, take: pageSize, search: params.search }),
    repo.countStudentsWithGuardians(params.search),
  ]);

  const students: StudentGuardians[] = rows.map((s) => ({
    studentId: s.id,
    code: s.studentCode,
    name: personName(s),
    guardians: s.guardians.map(
      (g): GuardianRow => ({
        id: g.id,
        fullName: g.fullName,
        relation: g.relation,
        phone: g.phone,
        lineStatus: lineStatus(g),
        linkCode: g.lineUserId ? null : g.lineLinkCode,
      }),
    ),
  }));

  return paginate(students, total, params.page, pageSize);
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
