"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { scanSettingSchema, kioskCreateSchema, kioskUpdateSchema, kioskPasswordSchema } from "@/features/kiosk/schemas/kiosk-schema";
import * as service from "@/features/kiosk/services/kiosk-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import { parseAdmsIpList, saveAdmsNetworks } from "@/features/faces/services/zkteco-networks";
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

export async function saveAdmsNetworkAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(["ADMIN"]);
    const revisionValue = toText(formData.get("revision"));
    const revision = Number(revisionValue);
    const input = formData.get("allowedIps");
    if (!/^\d+$/u.test(revisionValue) || !Number.isSafeInteger(revision) || typeof input !== "string") {
      return { ok: false, message: "กรุณาโหลดหน้าใหม่แล้วบันทึกอีกครั้ง" };
    }

    const allowedIps = parseAdmsIpList(input);
    if (!allowedIps) return { ok: false, message: "กรอก Public IPv4 หรือ IPv6 ที่ถูกต้องทีละ IP" };
    if (!await saveAdmsNetworks(allowedIps, revision)) {
      return { ok: false, message: "รายการเครือข่ายเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่ก่อนบันทึก" };
    }
    revalidatePath(KIOSK_PATH);
    return { ok: true, message: "บันทึกเครือข่ายที่อนุญาตแล้ว" };
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
