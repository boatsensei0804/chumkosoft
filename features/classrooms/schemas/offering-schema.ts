import { z } from "zod";

/** Assign a course to a classroom for the active term (who teaches it, where). */
export const offeringSchema = z.object({
  courseId: z.string().trim().min(1, "กรุณาเลือกรายวิชา"),
  teacherId: z.string().trim().min(1, "กรุณาเลือกผู้สอน"),
  roomId: z.string().trim().min(1, "กรุณาเลือกห้อง"),
  periodsPerWeek: z
    .number({ message: "จำนวนคาบต้องเป็นตัวเลข" })
    .int("จำนวนคาบต้องเป็นจำนวนเต็ม")
    .min(1, "อย่างน้อย 1 คาบ")
    .max(20, "จำนวนคาบมากเกินไป"),
});

export type OfferingInput = z.infer<typeof offeringSchema>;
