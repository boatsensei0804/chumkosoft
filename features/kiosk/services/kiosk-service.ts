import "server-only";

import * as repo from "@/features/kiosk/repositories/kiosk-repository";
import { hashPassword } from "@/lib/password";
import { formatThaiDate } from "@/utils/thai-date";
import type { ScanSettingInput, KioskCreateInput, KioskUpdateInput } from "@/features/kiosk/schemas/kiosk-schema";
import type { ScanSettingView, KioskAccountRow } from "@/features/kiosk/types";
import type { ActionResult } from "@/types/form";

// ── Scan-window settings ─────────────────────────────────────────────────────

export async function getScanSetting(): Promise<ScanSettingView> {
  return repo.getScanSetting();
}

export async function saveScanSettingRecord(input: ScanSettingInput): Promise<ActionResult> {
  await repo.upsertScanSetting(input);
  return { ok: true, message: "บันทึกเวลาสแกนเรียบร้อย" };
}

// ── Kiosk accounts ───────────────────────────────────────────────────────────

export async function listKioskAccounts(): Promise<KioskAccountRow[]> {
  const rows = await repo.listKioskAccounts();
  return rows.map((r) => ({ id: r.id, email: r.email, isActive: r.isActive, createdAt: formatThaiDate(r.createdAt) }));
}

export async function createKioskAccountRecord(input: KioskCreateInput): Promise<ActionResult> {
  if (await repo.kioskEmailExists(input.email)) {
    return { ok: false, fieldErrors: { email: "อีเมลนี้ถูกใช้แล้ว" } };
  }
  await repo.createKioskAccount(input.email, await hashPassword(input.password));
  return { ok: true, message: "สร้างบัญชีจุดสแกนเรียบร้อย" };
}

export async function updateKioskAccountRecord(id: string, input: KioskUpdateInput): Promise<ActionResult> {
  const account = await repo.getKioskAccount(id);
  if (!account) return { ok: false, message: "ไม่พบบัญชี" };
  if (await repo.kioskEmailExists(input.email, id)) {
    return { ok: false, fieldErrors: { email: "อีเมลนี้ถูกใช้แล้ว" } };
  }
  await repo.updateKioskAccount(id, input);
  return { ok: true, message: "บันทึกการแก้ไขเรียบร้อย" };
}

export async function resetKioskPasswordRecord(id: string, password: string): Promise<ActionResult> {
  const account = await repo.getKioskAccount(id);
  if (!account) return { ok: false, message: "ไม่พบบัญชี" };
  await repo.setKioskPassword(id, await hashPassword(password));
  return { ok: true, message: "ตั้งรหัสผ่านใหม่เรียบร้อย" };
}

export async function deleteKioskAccountRecord(id: string): Promise<ActionResult> {
  const account = await repo.getKioskAccount(id);
  if (!account) return { ok: false, message: "ไม่พบบัญชี" };
  await repo.softDeleteKioskAccount(id);
  return { ok: true, message: "ลบบัญชีจุดสแกนเรียบร้อย" };
}
