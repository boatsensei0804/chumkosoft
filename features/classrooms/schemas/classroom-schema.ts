import { z } from "zod";

/**
 * Classroom (a cohort / homeroom) create/update input. `advisorIds` are the homeroom
 * advisor teachers (ครูที่ปรึกษา) — a classroom may have zero or more.
 */
export const classroomSchema = z.object({
  code: z.string().trim().min(1, "กรุณากรอกชื่อห้อง").max(30, "ชื่อห้องยาวเกินไป"),
  gradeLevel: z.string().trim().min(1, "กรุณากรอกระดับชั้น").max(50, "ระดับชั้นยาวเกินไป"),
  advisorIds: z.array(z.string().trim().min(1)).default([]),
});

export type ClassroomInput = z.infer<typeof classroomSchema>;
