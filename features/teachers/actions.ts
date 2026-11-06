"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { staffSchema } from "@/features/teachers/schemas/staff-schema";
import {
  createStaffRecord,
  updateStaffRecord,
  deleteStaffRecord,
} from "@/services/staff-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const TEACHERS_PATH = "/dashboard/teachers";

function toText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullIfEmpty(value: FormDataEntryValue | null): string | null {
  const text = toText(value);
  return text === "" ? null : text;
}

function toDateOrNull(value: FormDataEntryValue | null): Date | null {
  const text = toText(value);
  return text === "" ? null : new Date(text);
}

function toIntOrNull(value: FormDataEntryValue | null): number | null {
  const text = toText(value).replace(/,/g, "");
  return text === "" ? null : Number(text);
}

/** Keep only digits so a formatted national ID ("1-2345-...") still validates. */
function toNationalId(value: FormDataEntryValue | null): string | null {
  const digits = toText(value).replace(/\D/g, "");
  return digits === "" ? null : digits;
}

export async function saveStaffAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const currentUser = await requireRoles(STAFF_ROLES);

    const id = toText(formData.get("id"));
    const rawLoginPassword = formData.get("loginPassword");
    const loginPassword = typeof rawLoginPassword === "string" && rawLoginPassword.length > 0 ? rawLoginPassword : undefined;
    if (loginPassword && currentUser.role !== "ADMIN") {
      return { ok: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สร้างหรือเปลี่ยนรหัสผ่านบัญชีบุคลากรได้" };
    }
    if (loginPassword && (loginPassword.length < 8 || loginPassword.length > 100)) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: { loginPassword: "รหัสผ่านต้องมี 8–100 ตัวอักษร" } };
    }
    const parsed = staffSchema.safeParse({
      staffCode: formData.get("staffCode"),
      prefix: nullIfEmpty(formData.get("prefix")),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      type: formData.get("type"),
      position: nullIfEmpty(formData.get("position")),
      email: nullIfEmpty(formData.get("email"))?.toLowerCase() ?? null,
      phone: nullIfEmpty(formData.get("phone")),
      birthDate: toDateOrNull(formData.get("birthDate")),
      nationalId: toNationalId(formData.get("nationalId")),
      positionNumber: nullIfEmpty(formData.get("positionNumber")),
      salary: toIntOrNull(formData.get("salary")),
      licenseNumber: nullIfEmpty(formData.get("licenseNumber")),
      licenseExpiry: toDateOrNull(formData.get("licenseExpiry")),
      degreeBachelor: nullIfEmpty(formData.get("degreeBachelor")),
      fieldBachelor: nullIfEmpty(formData.get("fieldBachelor")),
      universityBachelor: nullIfEmpty(formData.get("universityBachelor")),
      degreeMaster: nullIfEmpty(formData.get("degreeMaster")),
      fieldMaster: nullIfEmpty(formData.get("fieldMaster")),
      universityMaster: nullIfEmpty(formData.get("universityMaster")),
    });

    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = id
      ? await updateStaffRecord(id, parsed.data, loginPassword, currentUser.role === "ADMIN")
      : await createStaffRecord(parsed.data, loginPassword);

    if (result.ok) {
      revalidatePath(TEACHERS_PATH);
    }
    return result;
  });
}

export async function deleteStaffAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);
    const result = await deleteStaffRecord(id);
    if (result.ok) {
      revalidatePath(TEACHERS_PATH);
    }
    return result;
  });
}
