import { z } from "zod";

/**
 * Course create/update input. `credits` and `description` are optional; empty form
 * values are normalized to null by the action before parsing.
 */
export const courseSchema = z.object({
  code: z.string().trim().min(1, "กรุณากรอกรหัสวิชา").max(20, "รหัสวิชายาวเกินไป"),
  name: z.string().trim().min(1, "กรุณากรอกชื่อรายวิชา").max(200, "ชื่อรายวิชายาวเกินไป"),
  credits: z
    .number({ message: "หน่วยกิตต้องเป็นตัวเลข" })
    .min(0, "หน่วยกิตต้องไม่ติดลบ")
    .max(20, "หน่วยกิตมากเกินไป")
    .nullable(),
  description: z.string().trim().max(500, "คำอธิบายยาวเกินไป").nullable(),
});

export type CourseInput = z.infer<typeof courseSchema>;
