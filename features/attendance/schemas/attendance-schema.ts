import { z } from "zod";
import { ATTENDANCE_STATUSES } from "@/features/attendance/types";

export const attendanceEntrySchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().trim().max(200, "หมายเหตุยาวเกินไป").nullable(),
});

export const saveAttendanceSchema = z.object({
  offeringId: z.string().min(1, "กรุณาเลือกรายวิชา"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง"),
  entries: z.array(attendanceEntrySchema).min(1, "ไม่มีรายชื่อนักเรียน"),
});

export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;
