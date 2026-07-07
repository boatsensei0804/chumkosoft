"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { offeringSchema } from "@/features/classrooms/schemas/offering-schema";
import { addOfferingRecord, deleteOfferingRecord, getOfferingClassroomId } from "@/features/classrooms/services/classroom-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

function toText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function addOfferingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);

    const classroomId = toText(formData.get("classroomId"));
    if (!classroomId) return { ok: false, message: "ไม่พบห้องเรียน" };

    // Optional: the term the caller is viewing (timetable). Empty → active term.
    const termId = toText(formData.get("termId")) || undefined;

    const periodsRaw = toText(formData.get("periodsPerWeek"));
    const parsed = offeringSchema.safeParse({
      courseId: formData.get("courseId"),
      teacherId: formData.get("teacherId"),
      roomId: formData.get("roomId"),
      periodsPerWeek: periodsRaw === "" ? NaN : Number(periodsRaw),
    });
    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = await addOfferingRecord(classroomId, parsed.data, termId);
    if (result.ok) {
      revalidatePath(`/dashboard/classrooms/${classroomId}`);
      revalidatePath("/dashboard/timetable");
    }
    return result;
  });
}

export async function deleteOfferingAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);
    const classroomId = await getOfferingClassroomId(id);
    const result = await deleteOfferingRecord(id);
    if (result.ok && classroomId) {
      revalidatePath(`/dashboard/classrooms/${classroomId}`);
      revalidatePath("/dashboard/timetable");
    }
    return result;
  });
}
