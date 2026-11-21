"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import prisma from "@/lib/prisma";
import { z } from "zod";
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
    await requireRoles(["ADMIN"]);

    const id = toText(formData.get("id"));
    const rawLoginPassword = formData.get("loginPassword");
    const loginPassword = typeof rawLoginPassword === "string" && rawLoginPassword.length > 0 ? rawLoginPassword : undefined;
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
      ? await updateStaffRecord(id, parsed.data, loginPassword, true)
      : await createStaffRecord(parsed.data, loginPassword);

    if (result.ok) {
      revalidatePath(TEACHERS_PATH);
    }
    return result;
  });
}

export async function deleteStaffAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const result = await deleteStaffRecord(id);
    if (result.ok) {
      revalidatePath(TEACHERS_PATH);
    }
    return result;
  });
}

const ownProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30),
  email: z.union([z.email(), z.literal("")]),
});

/** Teachers can update their own contact details, never personnel type or payroll fields. */
export async function saveOwnStaffAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(["TEACHER"]);
    if (!user.staffId) return { ok: false, message: "บัญชีนี้ยังไม่เชื่อมกับข้อมูลครู" };
    const parsed = ownProfileSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: toText(formData.get("phone")),
      email: toText(formData.get("email")).toLowerCase(),
    });
    if (!parsed.success) return { ok: false, message: "กรุณาตรวจสอบชื่อ อีเมล และเบอร์โทรศัพท์" };
    const result = await prisma.staff.updateMany({
      where: { id: user.staffId, isDeleted: false },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
      },
    });
    if (result.count === 0) return { ok: false, message: "ไม่พบข้อมูลครูที่เชื่อมกับบัญชีนี้" };
    revalidatePath(TEACHERS_PATH);
    revalidatePath(`${TEACHERS_PATH}/${user.staffId}`);
    return { ok: true, message: "บันทึกข้อมูลส่วนตัวเรียบร้อย" };
  });
}
