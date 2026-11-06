import { z } from "zod";
import { DAILY_ROLL_CALL_STATUSES } from "@/features/attendance/types";

export const dailyRollCallSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง"),
  classroomId: z.string().min(1, "กรุณาเลือกห้องเรียน"),
  entries: z.array(z.object({ studentId: z.string().min(1), status: z.enum(DAILY_ROLL_CALL_STATUSES) })).min(1, "เลือกสถานะนักเรียนอย่างน้อย 1 คน"),
});
