import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Scan-window settings: gate open time + late cutoff (both "HH:MM"). */
export const scanSettingSchema = z
  .object({
    scanStartTime: z.string().regex(TIME_RE, "เวลาเริ่มสแกนไม่ถูกต้อง"),
    lateAfterTime: z.string().regex(TIME_RE, "เวลาสายไม่ถูกต้อง"),
  })
  .refine((v) => v.lateAfterTime > v.scanStartTime, {
    message: "เวลาสายต้องอยู่หลังเวลาเริ่มสแกน",
    path: ["lateAfterTime"],
  });

export type ScanSettingInput = z.infer<typeof scanSettingSchema>;

/** Create a kiosk login account. */
export const kioskCreateSchema = z.object({
  email: z.string().trim().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง").max(150),
  password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร").max(100),
});

export type KioskCreateInput = z.infer<typeof kioskCreateSchema>;

/** Edit a kiosk account (email + active). Password reset is a separate action. */
export const kioskUpdateSchema = z.object({
  email: z.string().trim().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง").max(150),
  isActive: z.boolean(),
});

export type KioskUpdateInput = z.infer<typeof kioskUpdateSchema>;

export const kioskPasswordSchema = z.object({
  password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร").max(100),
});
