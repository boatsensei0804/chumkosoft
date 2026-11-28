import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import type { ActionResult } from "@/types/form";

export const admsKioskAccount = { role: "KIOSK", isActive: true, isDeleted: false } as const;

export function legacyAdmsDevice() {
  const id = z.uuid().safeParse(process.env.ZKTECO_ADMS_DEVICE_ID);
  const serial = process.env.ZKTECO_ADMS_SERIAL;
  return id.success && serial && /^[a-z0-9-]{1,64}$/iu.test(serial) ? { id: id.data, serial: serial.toUpperCase() } : null;
}

export const admsDeviceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  serial: z.string().trim().regex(/^[a-z0-9-]{1,64}$/iu).transform((s) => s.toUpperCase()),
  location: z.string().trim().min(1).max(100),
  kioskUserId: z.string().min(1).max(100),
});
type AdmsDeviceInput = z.infer<typeof admsDeviceSchema>;

export async function listAdmsDevices() {
  const legacy = legacyAdmsDevice();
  return prisma.scannerDevice.findMany({
    where: { removedAt: null, OR: [{ admsSerial: { not: null } }, ...(legacy ? [{ id: legacy.id, admsSerial: null }] : [])] },
    select: {
      id: true, name: true, admsLocation: true, admsSerial: true, admsEnabled: true,
      admsLastSeenAt: true, admsLastSyncAt: true, admsLastUploadAt: true, admsLastUploadResult: true,
      kioskUser: { select: { email: true, id: true, isActive: true, isDeleted: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function saveAdmsDevice(input: AdmsDeviceInput, actorId: string, id?: string): Promise<ActionResult> {
  return prisma.$transaction(async (tx) => {
    const kiosk = await tx.user.findFirst({ where: { id: input.kioskUserId, ...admsKioskAccount }, select: { id: true } });
    if (!kiosk) return { ok: false, message: "เลือกบัญชีจุดสแกนที่เปิดใช้งาน" };

    const { name, serial, location, kioskUserId } = input;
    const existing = await tx.scannerDevice.findUnique({ where: { admsSerial: serial }, select: { id: true, removedAt: true } });
    if (existing && !existing.removedAt && existing.id !== id) return { ok: false, message: "เลข Serial นี้ลงทะเบียนไว้แล้ว" };

    const legacy = legacyAdmsDevice();
    if (id && existing?.id !== id && (legacy?.id !== id || legacy.serial !== serial)) {
      return { ok: false, message: "เลข Serial ของเครื่องที่ลงทะเบียนไว้เปลี่ยนไม่ได้" };
    }
    const target = id ?? (existing?.removedAt ? existing.id : undefined) ?? (legacy?.serial === serial ? legacy.id : undefined);
    const values = { removedAt: null, ...(existing?.removedAt && { admsEnabled: true }), name, admsSerial: serial, admsLocation: location, kioskUserId };
    const updated = target ? await tx.scannerDevice.updateMany({
      where: { id: target, OR: [{ admsSerial: serial }, ...(target === legacy?.id ? [{ admsSerial: null }] : [])] },
      data: values,
    }) : null;
    if (id && !updated?.count) return { ok: false, message: "ไม่พบเครื่อง ZKTeco ที่เลือก" };
    const deviceId = updated?.count && target ? target : randomUUID();
    if (!updated?.count) await tx.scannerDevice.create({ data: { id: deviceId, ...values } });
    await tx.auditLog.create({ data: {
      actorId, action: "scanner.adms.save", targetType: "scanner-device", targetId: deviceId,
    } });
    return { ok: true, message: "บันทึกข้อมูลเครื่อง ZKTeco แล้ว" };
  });
}

export async function setAdmsDeviceEnabled(id: string, enabled: boolean, actorId: string): Promise<ActionResult> {
  const legacy = legacyAdmsDevice();
  return prisma.$transaction(async (tx) => {
    const result = await tx.scannerDevice.updateMany({
      where: { id, OR: [{ admsSerial: { not: null } }, ...(id === legacy?.id ? [{ admsSerial: null }] : [])] },
      data: { admsEnabled: enabled },
    });
    if (!result.count) return { ok: false, message: "ไม่พบเครื่อง ZKTeco ที่เลือก" };
    await tx.auditLog.create({ data: {
      actorId, action: enabled ? "scanner.adms.enable" : "scanner.adms.disable", targetType: "scanner-device", targetId: id,
    } });
    return { ok: true, message: enabled ? "เปิดรับบันทึกจากเครื่องนี้แล้ว" : "หยุดรับบันทึกจากเครื่องนี้แล้ว" };
  });
}
