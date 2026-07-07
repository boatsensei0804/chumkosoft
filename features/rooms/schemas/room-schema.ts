import { z } from "zod";

/** Physical room / lab. Optional fields are normalized to null by the action. */
export const roomSchema = z.object({
  code: z.string().trim().min(1, "กรุณากรอกรหัสห้อง").max(30, "รหัสห้องยาวเกินไป"),
  name: z.string().trim().max(100, "ชื่อห้องยาวเกินไป").nullable(),
  building: z.string().trim().max(60, "ชื่ออาคารยาวเกินไป").nullable(),
  capacity: z
    .number({ message: "ความจุต้องเป็นตัวเลข" })
    .int("ความจุต้องเป็นจำนวนเต็ม")
    .min(0, "ความจุต้องไม่ติดลบ")
    .max(1000, "ความจุมากเกินไป")
    .nullable(),
});

export type RoomInput = z.infer<typeof roomSchema>;
