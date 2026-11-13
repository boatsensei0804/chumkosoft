"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { checkInStudent, checkOutStudent } from "@/features/attendance/services/school-entry-service";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const ATTENDANCE_PATH = "/dashboard/attendance";

export async function checkInAction(studentId: string, date: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(STAFF_ROLES);
    const result = await checkInStudent(studentId, date, user.role === "ADMIN" ? null : user.staffId ?? "__no_staff__", user.id);
    if (result.ok) revalidatePath(ATTENDANCE_PATH);
    return result;
  });
}

export async function checkOutAction(studentId: string, date: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(STAFF_ROLES);
    const result = await checkOutStudent(studentId, date, user.role === "ADMIN" ? null : user.staffId ?? "__no_staff__");
    if (result.ok) revalidatePath(ATTENDANCE_PATH);
    return result;
  });
}
