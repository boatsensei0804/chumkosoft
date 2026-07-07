import { z } from "zod";

export const STAFF_KINDS = ["TEACHER", "PERSONNEL", "ADMIN"] as const;

const optionalText = (max: number, label: string) => z.string().trim().max(max, `${label}ยาวเกินไป`).nullable();

// Government-personnel fields are optional data — accept missing/undefined too, so a
// staff record stays valid without them.
const personnelText = (max: number, label: string) => z.string().trim().max(max, `${label}ยาวเกินไป`).nullish();

/**
 * Staff create/update input. Optional text fields are normalized to null by the
 * action before parsing; dates arrive as `Date | null` and salary as `number | null`.
 * The extra fields mirror the government education-personnel intake form.
 */
export const staffSchema = z.object({
  staffCode: z.string().trim().min(1, "กรุณากรอกรหัสบุคลากร").max(20, "รหัสบุคลากรยาวเกินไป"),
  prefix: optionalText(20, "คำนำหน้า"),
  firstName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100, "ชื่อยาวเกินไป"),
  lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล").max(100, "นามสกุลยาวเกินไป"),
  type: z.enum(STAFF_KINDS, { message: "กรุณาเลือกประเภทบุคลากร" }),
  position: optionalText(150, "ตำแหน่ง"),
  email: z.string().trim().max(150, "อีเมลยาวเกินไป").email("รูปแบบอีเมลไม่ถูกต้อง").nullable(),
  phone: optionalText(30, "เบอร์โทร"),

  // Government personnel record
  birthDate: z.date({ message: "วันเกิดไม่ถูกต้อง" }).nullish(),
  nationalId: z
    .string()
    .trim()
    .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องมี 13 หลัก")
    .nullish(),
  positionNumber: personnelText(50, "เลขที่ตำแหน่ง"),
  salary: z
    .number({ message: "เงินเดือนต้องเป็นตัวเลข" })
    .int("เงินเดือนต้องเป็นจำนวนเต็ม")
    .nonnegative("เงินเดือนต้องไม่ติดลบ")
    .max(10_000_000, "เงินเดือนไม่ถูกต้อง")
    .nullish(),
  licenseNumber: personnelText(50, "เลขที่ใบอนุญาต"),
  licenseExpiry: z.date({ message: "วันหมดอายุใบอนุญาตไม่ถูกต้อง" }).nullish(),

  // Education background
  degreeBachelor: personnelText(150, "คุณวุฒิปริญญาตรี"),
  fieldBachelor: personnelText(150, "สาขา"),
  universityBachelor: personnelText(200, "มหาวิทยาลัย"),
  degreeMaster: personnelText(150, "คุณวุฒิปริญญาโท"),
  fieldMaster: personnelText(150, "สาขา"),
  universityMaster: personnelText(200, "มหาวิทยาลัย"),
});

export type StaffInput = z.infer<typeof staffSchema>;
