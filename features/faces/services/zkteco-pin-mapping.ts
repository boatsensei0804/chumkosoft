import "server-only";
import { z } from "zod";
import prisma from "@/lib/prisma";
import type { ActionResult } from "@/types/form";
import type { ScannerPinMappingInput } from "../zkteco-pin-mapping";
import { admsKioskAccount, legacyAdmsDevice } from "./zkteco-devices";

const legacyMapSchema = z.record(z.string().regex(/^\d{1,9}$/u), z.string().trim().min(1).max(80));

export function legacyScannerPinMap(deviceId: string): Record<string, string> {
  if (deviceId !== legacyAdmsDevice()?.id) return {};
  try {
    return legacyMapSchema.parse(JSON.parse(process.env.ZKTECO_ADMS_PIN_MAP ?? "{}"));
  } catch {
    return {};
  }
}

function mappingDeviceWhere(id: string) {
  const legacy = legacyAdmsDevice();
  return { id, OR: [{ admsSerial: { not: null } }, ...(id === legacy?.id ? [{ admsSerial: null }] : [])], kioskUser: admsKioskAccount };
}

export async function getPinMappingDevice(requestedId?: string) {
  const id = requestedId ? z.uuid().safeParse(requestedId).data : legacyAdmsDevice()?.id;
  if (!id) return null;
  return prisma.scannerDevice.findFirst({
    where: mappingDeviceWhere(id),
    select: { id: true, name: true, pinMappings: {
      orderBy: { pin: "asc" },
      select: { pin: true, student: { select: { studentCode: true, firstName: true, lastName: true, isDeleted: true } } },
    } },
  });
}

export async function savePinMappings(
  deviceId: string, rows: ScannerPinMappingInput[], actorId: string, allowReassignment = false,
): Promise<ActionResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "ScannerDevice" WHERE id = ${deviceId}::uuid FOR UPDATE`;
    if (!locked.length || !await tx.scannerDevice.findFirst({ where: mappingDeviceWhere(deviceId), select: { id: true } })) {
      return { ok: false, message: "เครื่องสแกนหรือบัญชีจุดสแกนยังไม่พร้อม" };
    }

    const students = await tx.student.findMany({
      where: { studentCode: { in: rows.map(({ studentCode }) => studentCode) }, isDeleted: false },
      select: { id: true, studentCode: true },
    });
    const studentByCode = new Map(students.map(({ studentCode, id }) => [studentCode, id]));
    const current = await tx.scannerPinMapping.findMany({
      where: { deviceId, pin: { in: rows.map(({ pin }) => pin) } },
      select: { pin: true, studentId: true },
    });
    const currentByPin = new Map(current.map((row) => [row.pin, row]));
    const legacy = legacyScannerPinMap(deviceId);
    const linkedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    const inserts: { deviceId: string; pin: string; studentId: string; linkedAt: Date }[] = [];
    const updates: { pin: string; studentId: string }[] = [];

    for (const { pin, studentCode } of rows) {
      const studentId = studentByCode.get(studentCode);
      if (!studentId) return { ok: false, message: `ไม่พบนักเรียนรหัส ${studentCode} ในทะเบียนที่ใช้งาน` };
      const previous = currentByPin.get(pin);
      if (previous?.studentId === studentId) continue;
      const conflicts = previous ? Boolean(previous.studentId) : Boolean(legacy[pin] && legacy[pin] !== studentCode);
      if (conflicts && !allowReassignment) {
        return { ok: false, message: `รหัสเครื่อง ${pin} ผูกกับนักเรียนคนอื่นอยู่ ให้แก้ทีละคนด้วยแบบฟอร์มด้านบน` };
      }
      if (previous) updates.push({ pin, studentId });
      else inserts.push({ deviceId, pin, studentId, linkedAt: legacy[pin] === studentCode ? new Date(0) : linkedAt });
    }

    if (inserts.length) await tx.scannerPinMapping.createMany({ data: inserts });
    for (const { pin, studentId } of updates) {
      await tx.scannerPinMapping.update({ where: { deviceId_pin: { deviceId, pin } }, data: { studentId, linkedAt } });
    }
    const changed = inserts.length + updates.length;
    if (changed) await tx.auditLog.create({ data: {
      actorId, action: "scanner.pin-mapping.save", targetType: "scanner-device", targetId: deviceId,
      detail: `จับคู่หรือแก้ไข ${changed} รายการ`,
    } });
    return { ok: true, message: changed ? `บันทึกคู่รหัสแล้ว ${changed} รายการ` : "คู่รหัสตรงกับข้อมูลที่บันทึกไว้แล้ว" };
  }, { timeout: 20_000 });
}

export async function unlinkScannerPin(deviceId: string, pin: string, actorId: string): Promise<ActionResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "ScannerDevice" WHERE id = ${deviceId}::uuid FOR UPDATE`;
    if (!locked.length || !await tx.scannerDevice.findFirst({ where: mappingDeviceWhere(deviceId), select: { id: true } })) {
      return { ok: false, message: "ไม่พบเครื่องที่ตั้งค่า ADMS" };
    }
    await tx.scannerPinMapping.upsert({
      where: { deviceId_pin: { deviceId, pin } },
      create: { deviceId, pin, studentId: null },
      update: { studentId: null, linkedAt: new Date() },
    });
    await tx.auditLog.create({ data: { actorId, action: "scanner.pin-mapping.unlink", targetType: "scanner-device", targetId: deviceId } });
    return { ok: true, message: `ยกเลิกการจับคู่รหัส ${pin} แล้ว` };
  });
}
