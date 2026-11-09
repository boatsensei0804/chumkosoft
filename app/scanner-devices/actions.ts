"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRoles } from "@/lib/dal";
import { scanSettingSchema } from "@/features/kiosk/schemas/kiosk-schema";
import { upsertScanSetting } from "@/features/kiosk/repositories/kiosk-repository";

const deviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  cameraIndex: z.coerce.number().int().min(0).max(9),
  detectionIntervalSeconds: z.coerce.number().refine((v) => [0.5, 0.85, 1.5].includes(v)),
  repeatCooldownSeconds: z.coerce.number().int().refine((v) => [10, 30, 60].includes(v)),
});

export async function saveScannerDevice(formData: FormData): Promise<void> {
  const user = await requireRoles(["ADMIN", "KIOSK"]);
  const parsed = deviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("การตั้งค่าเครื่องสแกนไม่ถูกต้อง");
  const { id, ...data } = parsed.data;
  const result = await prisma.scannerDevice.updateMany({
    where: { id, ...(user.role === "KIOSK" ? { kioskUserId: user.id } : {}) }, data,
  });
  if (!result.count) throw new Error("ไม่พบเครื่องสแกนที่คุณดูแล");
  revalidatePath("/scanner-devices");
}

export async function saveScannerTime(formData: FormData): Promise<void> {
  await requireRoles(["ADMIN"]);
  const parsed = scanSettingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("เวลาเริ่มสแกนหรือเวลาสายไม่ถูกต้อง");
  await upsertScanSetting(parsed.data);
  revalidatePath("/scanner-devices");
}
