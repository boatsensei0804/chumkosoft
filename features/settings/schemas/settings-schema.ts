import { z } from "zod";

export const yearSchema = z
  .object({
    buddhistYear: z
      .number({ message: "ปีการศึกษาต้องเป็นตัวเลข" })
      .int("ปีการศึกษาต้องเป็นจำนวนเต็ม")
      .min(2400, "ปีการศึกษาไม่ถูกต้อง")
      .max(2700, "ปีการศึกษาไม่ถูกต้อง"),
    startDate: z.date({ message: "วันเปิดปีการศึกษาไม่ถูกต้อง" }),
    endDate: z.date({ message: "วันปิดปีการศึกษาไม่ถูกต้อง" }),
  })
  .refine((v) => v.endDate > v.startDate, { message: "วันปิดต้องอยู่หลังวันเปิด", path: ["endDate"] });

export type YearInput = z.infer<typeof yearSchema>;

export const TERM_STATUSES = ["UPCOMING", "ACTIVE", "CLOSED"] as const;

export const termSchema = z
  .object({
    name: z.string().trim().min(1, "กรุณากรอกชื่อภาคเรียน").max(80, "ชื่อภาคเรียนยาวเกินไป"),
    number: z.number({ message: "ภาคเรียนต้องเป็นตัวเลข" }).int().min(1, "ภาคเรียนไม่ถูกต้อง").max(6, "ภาคเรียนไม่ถูกต้อง"),
    startDate: z.date({ message: "วันเปิดภาคเรียนไม่ถูกต้อง" }),
    endDate: z.date({ message: "วันปิดภาคเรียนไม่ถูกต้อง" }),
    status: z.enum(TERM_STATUSES),
  })
  .refine((v) => v.endDate > v.startDate, { message: "วันปิดต้องอยู่หลังวันเปิด", path: ["endDate"] });

export type TermInput = z.infer<typeof termSchema>;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const periodItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "กรุณากรอกชื่อคาบ").max(40, "ชื่อคาบยาวเกินไป"),
  startTime: z.string().regex(TIME_RE, "เวลาเริ่มไม่ถูกต้อง"),
  endTime: z.string().regex(TIME_RE, "เวลาสิ้นสุดไม่ถูกต้อง"),
  isBreak: z.boolean(),
});

export const periodsSchema = z
  .array(periodItemSchema)
  .min(1, "ต้องมีอย่างน้อยหนึ่งคาบ")
  .max(20, "จำนวนคาบมากเกินไป");

export type PeriodInput = z.infer<typeof periodItemSchema>;
