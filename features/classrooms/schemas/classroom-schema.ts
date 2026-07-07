import { z } from "zod";

/**
 * Classroom (a cohort / homeroom) create/update input. `homeroomTeacherId` is the
 * advisor teacher (ครูที่ปรึกษา); empty is normalized to null by the action.
 */
export const classroomSchema = z.object({
  code: z.string().trim().min(1, "กรุณากรอกชื่อห้อง").max(30, "ชื่อห้องยาวเกินไป"),
  gradeLevel: z.string().trim().min(1, "กรุณากรอกระดับชั้น").max(50, "ระดับชั้นยาวเกินไป"),
  homeroomTeacherId: z.string().trim().min(1).nullable(),
});

export type ClassroomInput = z.infer<typeof classroomSchema>;
