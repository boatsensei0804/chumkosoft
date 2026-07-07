"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { yearSchema, termSchema, periodsSchema } from "@/features/settings/schemas/settings-schema";
import * as service from "@/features/settings/services/settings-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";
import type { PeriodInput } from "@/features/settings/schemas/settings-schema";

const SETTINGS_PATH = "/dashboard/settings";

function toText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toDate(value: FormDataEntryValue | null): Date {
  return new Date(toText(value));
}

// ── Academic year ────────────────────────────────────────────────────────────

export async function saveYearAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const id = toText(formData.get("id"));
    const yearRaw = toText(formData.get("buddhistYear"));

    const parsed = yearSchema.safeParse({
      buddhistYear: yearRaw === "" ? NaN : Number(yearRaw),
      startDate: toDate(formData.get("startDate")),
      endDate: toDate(formData.get("endDate")),
    });
    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = await service.saveYear(id || null, parsed.data);
    if (result.ok) revalidatePath(SETTINGS_PATH);
    return result;
  });
}

export async function setActiveYearAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const result = await service.setActiveYear(id);
    if (result.ok) revalidatePath(SETTINGS_PATH);
    return result;
  });
}

// ── Term ─────────────────────────────────────────────────────────────────────

export async function saveTermAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const id = toText(formData.get("id"));
    const academicYearId = toText(formData.get("academicYearId"));
    const numberRaw = toText(formData.get("number"));

    if (!academicYearId) return { ok: false, message: "ไม่พบปีการศึกษา" };

    const parsed = termSchema.safeParse({
      name: formData.get("name"),
      number: numberRaw === "" ? NaN : Number(numberRaw),
      startDate: toDate(formData.get("startDate")),
      endDate: toDate(formData.get("endDate")),
      status: formData.get("status"),
    });
    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = await service.saveTerm(id || null, academicYearId, parsed.data);
    if (result.ok) revalidatePath(SETTINGS_PATH);
    return result;
  });
}

export async function setActiveTermAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const result = await service.setActiveTerm(id);
    if (result.ok) revalidatePath(SETTINGS_PATH);
    return result;
  });
}

export async function deleteTermAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const result = await service.deleteTerm(id);
    if (result.ok) revalidatePath(SETTINGS_PATH);
    return result;
  });
}

// ── Periods ──────────────────────────────────────────────────────────────────

export async function savePeriodsAction(items: PeriodInput[]): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const parsed = periodsSchema.safeParse(items);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลคาบเรียนไม่ถูกต้อง" };
    }
    const result = await service.savePeriods(parsed.data);
    if (result.ok) revalidatePath(SETTINGS_PATH);
    return result;
  });
}
