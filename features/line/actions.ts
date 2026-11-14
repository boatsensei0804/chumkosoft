"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { generateLinkCode, generateStudentLinkCode, prepareClassroomLinkCodes, unlinkGuardianLine, removeStudentLineAccount } from "@/features/line/services/line-service";
import { listGuardianClassrooms } from "@/features/guardians/services/guardian-service";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";
import { logAudit } from "@/lib/audit";

function revalidateLinePages(): void {
  revalidatePath("/dashboard/line");
  revalidatePath("/dashboard/guardians");
}

export async function prepareClassroomLinkCodesAction(classroomId: string): Promise<ActionResult & { created?: number }> {
  try {
    await requireRoles(STAFF_ROLES);
    const result = await prepareClassroomLinkCodes(classroomId);
    if (result.ok) {
      revalidatePath("/dashboard/line");
      revalidatePath("/dashboard/line/print");
    }
    return result;
  } catch (error) {
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(error);
    console.error("[prepareClassroomLinkCodesAction]", error);
    return { ok: false, message: "เตรียมรหัสไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function prepareAllClassroomLinkCodesAction(): Promise<ActionResult & { created?: number }> {
  try {
    await requireRoles(STAFF_ROLES);
    const classrooms = await listGuardianClassrooms();
    if (classrooms.length === 0) return { ok: false, message: "ยังไม่มีห้องเรียนในปีการศึกษาปัจจุบัน" };
    let created = 0;
    for (const classroom of classrooms) {
      const result = await prepareClassroomLinkCodes(classroom.id);
      if (!result.ok) return result;
      created += result.created ?? 0;
    }
    revalidatePath("/dashboard/line");
    return { ok: true, created, message: `เตรียมรหัสใหม่ ${created} คน จาก ${classrooms.length} ห้องเรียบร้อย` };
  } catch (error) {
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(error);
    console.error("[prepareAllClassroomLinkCodesAction]", error);
    return { ok: false, message: "เตรียมรหัสทุกห้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function generateLinkCodeAction(guardianId: string): Promise<ActionResult & { code?: string }> {
  try {
    await requireRoles(STAFF_ROLES);
    const result = await generateLinkCode(guardianId);
    if (result.ok) revalidateLinePages();
    return result;
  } catch (error) {
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(error);
    console.error("[generateLinkCodeAction]", error);
    return { ok: false, message: "สร้างรหัสไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function generateStudentLinkCodeAction(studentId: string): Promise<ActionResult & { code?: string }> {
  try {
    await requireRoles(STAFF_ROLES);
    const result = await generateStudentLinkCode(studentId);
    if (result.ok) revalidateLinePages();
    return result;
  } catch (error) {
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(error);
    console.error("[generateStudentLinkCodeAction]", error);
    return { ok: false, message: "สร้างรหัสไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function unlinkGuardianAction(guardianId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(STAFF_ROLES);
    const result = await unlinkGuardianLine(guardianId);
    if (result.ok) {
      await logAudit({ actorId: user.id, action: "line.guardian.unlink", targetType: "guardian", targetId: guardianId });
      revalidateLinePages();
    }
    return result;
  });
}

export async function removeStudentLineAccountAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(STAFF_ROLES);
    const result = await removeStudentLineAccount(id);
    if (result.ok) {
      await logAudit({ actorId: user.id, action: "line.student_account.remove", targetType: "studentLineAccount", targetId: id });
      revalidateLinePages();
    }
    return result;
  });
}
