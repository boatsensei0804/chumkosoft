"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { scanSettingSchema, kioskCreateSchema, kioskUpdateSchema, kioskPasswordSchema } from "@/features/kiosk/schemas/kiosk-schema";
import * as service from "@/features/kiosk/services/kiosk-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const KIOSK_PATH = "/dashboard/kiosk";

function toText(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

// ── Scan-window settings ─────────────────────────────────────────────────────

export async function saveScanSettingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const parsed = scanSettingSchema.safeParse({
      scanStartTime: formData.get("scanStartTime"),
      lateAfterTime: formData.get("lateAfterTime"),
    });
    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }
    const result = await service.saveScanSettingRecord(parsed.data);
    if (result.ok) revalidatePath(KIOSK_PATH);
    return result;
  });
}

// ── Kiosk accounts ───────────────────────────────────────────────────────────

export async function saveKioskAccountAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const id = toText(formData.get("id"));

    if (id) {
      const parsed = kioskUpdateSchema.safeParse({ email: formData.get("email"), isActive: formData.get("isActive") === "on" });
      if (!parsed.success) return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
      const result = await service.updateKioskAccountRecord(id, parsed.data);
      if (result.ok) revalidatePath(KIOSK_PATH);
      return result;
    }

    const parsed = kioskCreateSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await service.createKioskAccountRecord(parsed.data);
    if (result.ok) revalidatePath(KIOSK_PATH);
    return result;
  });
}

export async function resetKioskPasswordAction(id: string, password: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const parsed = kioskPasswordSchema.safeParse({ password });
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "รหัสผ่านไม่ถูกต้อง" };
    const result = await service.resetKioskPasswordRecord(id, parsed.data.password);
    if (result.ok) revalidatePath(KIOSK_PATH);
    return result;
  });
}

export async function deleteKioskAccountAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const result = await service.deleteKioskAccountRecord(id);
    if (result.ok) revalidatePath(KIOSK_PATH);
    return result;
  });
}
