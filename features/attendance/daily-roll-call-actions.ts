"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { dailyRollCallSchema } from "@/features/attendance/schemas/daily-roll-call-schema";
import { saveDailyRollCall } from "@/features/attendance/services/daily-roll-call-service";
import { runAction } from "@/lib/action-error";
import type { DailyRollCallStatusKey } from "@/features/attendance/types";
import type { ActionResult } from "@/types/form";

export async function saveDailyRollCallAction(
  date: string,
  classroomId: string,
  entries: { studentId: string; status: DailyRollCallStatusKey }[],
): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(STAFF_ROLES);
    const parsed = dailyRollCallSchema.safeParse({ date, classroomId, entries });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }
    const advisorStaffId = user.role === "ADMIN" ? null : user.staffId ?? "__no_staff__";
    const result = await saveDailyRollCall(user.id, date, classroomId, entries, advisorStaffId);
    if (result.ok) revalidatePath("/dashboard/attendance");
    return result;
  });
}
