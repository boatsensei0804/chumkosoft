import { z } from "zod";

export const guardianSchema = z.object({
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อผู้ปกครอง").max(120, "ชื่อยาวเกินไป"),
  relation: z.string().trim().min(1, "กรุณาระบุความสัมพันธ์").max(40, "ยาวเกินไป"),
  phone: z.string().trim().max(30, "เบอร์โทรยาวเกินไป").nullable(),
  prefix: z.string().trim().max(20, "คำนำหน้ายาวเกินไป").nullish(),
  nationalId: z
    .string()
    .trim()
    .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องมี 13 หลัก")
    .nullish(),
  occupation: z.string().trim().max(100, "อาชีพยาวเกินไป").nullish(),
  monthlyIncome: z.number({ message: "รายได้ต้องเป็นตัวเลข" }).int().nonnegative("รายได้ต้องไม่ติดลบ").max(100_000_000).nullish(),
  bloodType: z.string().trim().max(5).nullish(),
});

export type GuardianInput = z.infer<typeof guardianSchema>;
