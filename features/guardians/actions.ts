"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { guardianSchema } from "@/features/guardians/schemas/guardian-schema";
import {
  createGuardianRecord,
  updateGuardianRecord,
  deleteGuardianRecord,
} from "@/features/guardians/services/guardian-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const GUARDIANS_PATH = "/dashboard/guardians";

function toText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function saveGuardianAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);

    const id = toText(formData.get("id"));
    const studentId = toText(formData.get("studentId"));
    const nullIf = (v: FormDataEntryValue | null): string | null => (toText(v) === "" ? null : toText(v));
    const incomeRaw = toText(formData.get("monthlyIncome")).replace(/,/g, "");
    const nid = toText(formData.get("nationalId")).replace(/\D/g, "");

    const parsed = guardianSchema.safeParse({
      fullName: formData.get("fullName"),
      relation: formData.get("relation"),
      phone: nullIf(formData.get("phone")),
      prefix: nullIf(formData.get("prefix")),
      nationalId: nid === "" ? null : nid,
      occupation: nullIf(formData.get("occupation")),
      monthlyIncome: incomeRaw === "" ? null : Number(incomeRaw),
      bloodType: nullIf(formData.get("bloodType")),
    });
    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = id
      ? await updateGuardianRecord(id, parsed.data)
      : studentId
        ? await createGuardianRecord(studentId, parsed.data)
        : ({ ok: false, message: "ไม่พบนักเรียน" } satisfies ActionResult);

    if (result.ok) revalidatePath(GUARDIANS_PATH);
    return result;
  });
}

export async function deleteGuardianAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);
    const result = await deleteGuardianRecord(id);
    if (result.ok) revalidatePath(GUARDIANS_PATH);
    return result;
  });
}
