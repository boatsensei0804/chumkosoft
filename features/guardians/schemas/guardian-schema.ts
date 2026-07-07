import { z } from "zod";

export const guardianSchema = z.object({
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อผู้ปกครอง").max(120, "ชื่อยาวเกินไป"),
  relation: z.string().trim().min(1, "กรุณาระบุความสัมพันธ์").max(40, "ยาวเกินไป"),
  phone: z.string().trim().max(30, "เบอร์โทรยาวเกินไป").nullable(),
});

export type GuardianInput = z.infer<typeof guardianSchema>;
