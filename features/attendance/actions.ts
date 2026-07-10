"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { saveAttendanceSchema } from "@/features/attendance/schemas/attendance-schema";
import { saveRoster } from "@/features/attendance/services/attendance-service";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";
import type { AttendanceStatusKey } from "@/features/attendance/types";

export interface AttendanceEntryInput {
  studentId: string;
  status: AttendanceStatusKey;
  note: string | null;
}

/** Saves a full roster for (offering, date). Called from the client recorder. */
export async function saveAttendanceAction(
  offeringId: string,
  date: string,
  entries: AttendanceEntryInput[],
): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(STAFF_ROLES);

    const parsed = saveAttendanceSchema.safeParse({ offeringId, date, entries });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const teacherScope = user.role === "ADMIN" ? null : user.staffId;
    const result = await saveRoster(user.id, parsed.data, teacherScope);
    if (result.ok) {
      revalidatePath("/dashboard/attendance");
    }
    return result;
  });
}
