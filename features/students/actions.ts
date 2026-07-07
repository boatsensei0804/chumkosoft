"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { studentSchema } from "@/features/students/schemas/student-schema";
import {
  createStudentRecord,
  updateStudentRecord,
  deleteStudentRecord,
  deleteStudentRecords,
} from "@/services/student-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const STUDENTS_PATH = "/dashboard/students";

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

function toNumberOrNull(value: FormDataEntryValue | null): number | null {
  const text = toText(value).replace(/,/g, "");
  return text === "" ? null : Number(text);
}

function toNationalId(value: FormDataEntryValue | null): string | null {
  const digits = toText(value).replace(/\D/g, "");
  return digits === "" ? null : digits;
}

/** Multi-select checkboxes: keep only the non-empty selected values. */
function toStringArray(values: FormDataEntryValue[]): string[] {
  return values.map((v) => (typeof v === "string" ? v.trim() : "")).filter((v) => v !== "");
}

export async function saveStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);

    const id = toText(formData.get("id"));
    const parsed = studentSchema.safeParse({
      studentCode: formData.get("studentCode"),
      prefix: nullIfEmpty(formData.get("prefix")),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      gender: nullIfEmpty(formData.get("gender")),
      birthDate: toDateOrNull(formData.get("birthDate")),
      classroomId: nullIfEmpty(formData.get("classroomId")),

      nationalId: toNationalId(formData.get("nationalId")),
      firstNameEn: nullIfEmpty(formData.get("firstNameEn")),
      lastNameEn: nullIfEmpty(formData.get("lastNameEn")),
      ethnicity: nullIfEmpty(formData.get("ethnicity")),
      nationality: nullIfEmpty(formData.get("nationality")),
      religion: nullIfEmpty(formData.get("religion")),
      bloodType: nullIfEmpty(formData.get("bloodType")),
      primaryLanguage: nullIfEmpty(formData.get("primaryLanguage")),
      email: nullIfEmpty(formData.get("email")),
      phone: nullIfEmpty(formData.get("phone")),
      birthHospital: nullIfEmpty(formData.get("birthHospital")),
      birthTambon: nullIfEmpty(formData.get("birthTambon")),
      birthAmphoe: nullIfEmpty(formData.get("birthAmphoe")),
      birthProvince: nullIfEmpty(formData.get("birthProvince")),
      previousSchool: nullIfEmpty(formData.get("previousSchool")),
      studyPlan: nullIfEmpty(formData.get("studyPlan")),

      weightKg: toNumberOrNull(formData.get("weightKg")),
      heightCm: toNumberOrNull(formData.get("heightCm")),
      chronicDisease: nullIfEmpty(formData.get("chronicDisease")),

      regHouseRegNo: nullIfEmpty(formData.get("regHouseRegNo")),
      regHouseNo: nullIfEmpty(formData.get("regHouseNo")),
      regMoo: nullIfEmpty(formData.get("regMoo")),
      regSoi: nullIfEmpty(formData.get("regSoi")),
      regRoad: nullIfEmpty(formData.get("regRoad")),
      regTambon: nullIfEmpty(formData.get("regTambon")),
      regAmphoe: nullIfEmpty(formData.get("regAmphoe")),
      regProvince: nullIfEmpty(formData.get("regProvince")),
      regPostalCode: nullIfEmpty(formData.get("regPostalCode")),

      curHouseRegNo: nullIfEmpty(formData.get("curHouseRegNo")),
      curHouseNo: nullIfEmpty(formData.get("curHouseNo")),
      curMoo: nullIfEmpty(formData.get("curMoo")),
      curSoi: nullIfEmpty(formData.get("curSoi")),
      curRoad: nullIfEmpty(formData.get("curRoad")),
      curTambon: nullIfEmpty(formData.get("curTambon")),
      curAmphoe: nullIfEmpty(formData.get("curAmphoe")),
      curProvince: nullIfEmpty(formData.get("curProvince")),
      curPostalCode: nullIfEmpty(formData.get("curPostalCode")),

      commuteMethod: nullIfEmpty(formData.get("commuteMethod")),
      commuteRoadType: nullIfEmpty(formData.get("commuteRoadType")),
      commuteDistanceM: toNumberOrNull(formData.get("commuteDistanceM")),
      commuteMinutes: toNumberOrNull(formData.get("commuteMinutes")),

      parentMaritalStatus: nullIfEmpty(formData.get("parentMaritalStatus")),
      siblingsOlderBrothers: toNumberOrNull(formData.get("siblingsOlderBrothers")),
      siblingsOlderSisters: toNumberOrNull(formData.get("siblingsOlderSisters")),
      siblingsYoungerBrothers: toNumberOrNull(formData.get("siblingsYoungerBrothers")),
      siblingsYoungerSisters: toNumberOrNull(formData.get("siblingsYoungerSisters")),
      birthOrder: toNumberOrNull(formData.get("birthOrder")),
      dependantsCount: toNumberOrNull(formData.get("dependantsCount")),

      disadvantages: toStringArray(formData.getAll("disadvantages")),
      shortages: toStringArray(formData.getAll("shortages")),
      disabilities: toStringArray(formData.getAll("disabilities")),
    });

    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = id ? await updateStudentRecord(id, parsed.data) : await createStudentRecord(parsed.data);

    if (result.ok) {
      revalidatePath(STUDENTS_PATH);
    }
    return result;
  });
}

export async function deleteStudentAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);
    const result = await deleteStudentRecord(id);
    if (result.ok) {
      revalidatePath(STUDENTS_PATH);
    }
    return result;
  });
}

export async function deleteStudentsAction(ids: string[]): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);
    if (ids.length === 0) {
      return { ok: false, message: "ยังไม่ได้เลือกนักเรียน" };
    }
    const result = await deleteStudentRecords(ids);
    if (result.ok) {
      revalidatePath(STUDENTS_PATH);
    }
    return result;
  });
}
