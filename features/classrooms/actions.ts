"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { classroomSchema } from "@/features/classrooms/schemas/classroom-schema";
import {
  createClassroomRecord,
  updateClassroomRecord,
  deleteClassroomRecord,
} from "@/features/classrooms/services/classroom-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const CLASSROOMS_PATH = "/dashboard/classrooms";

function toText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function saveClassroomAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);

    const id = toText(formData.get("id"));
    const advisorIds = formData
      .getAll("advisorIds")
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v) => v !== "");
    const parsed = classroomSchema.safeParse({
      code: formData.get("code"),
      gradeLevel: formData.get("gradeLevel"),
      advisorIds,
    });

    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = id ? await updateClassroomRecord(id, parsed.data) : await createClassroomRecord(parsed.data);
    if (result.ok) {
      revalidatePath(CLASSROOMS_PATH);
      if (id) revalidatePath(`${CLASSROOMS_PATH}/${id}`);
    }
    return result;
  });
}

export async function deleteClassroomAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);
    const result = await deleteClassroomRecord(id);
    if (result.ok) revalidatePath(CLASSROOMS_PATH);
    return result;
  });
}
