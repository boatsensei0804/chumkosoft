"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { courseSchema } from "@/features/courses/schemas/course-schema";
import {
  createCourseRecord,
  updateCourseRecord,
  deleteCourseRecord,
} from "@/services/course-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const COURSES_PATH = "/dashboard/courses";

function toText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Create (no `id`) or update (with `id`) a course from the form dialog. */
export async function saveCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);

    const id = toText(formData.get("id"));
    const creditsRaw = toText(formData.get("credits"));
    const descriptionRaw = toText(formData.get("description"));

    const parsed = courseSchema.safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      credits: creditsRaw === "" ? null : Number(creditsRaw),
      description: descriptionRaw === "" ? null : descriptionRaw,
    });

    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = id ? await updateCourseRecord(id, parsed.data) : await createCourseRecord(parsed.data);

    if (result.ok) {
      revalidatePath(COURSES_PATH);
    }
    return result;
  });
}

export async function deleteCourseAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);
    const result = await deleteCourseRecord(id);
    if (result.ok) {
      revalidatePath(COURSES_PATH);
    }
    return result;
  });
}
