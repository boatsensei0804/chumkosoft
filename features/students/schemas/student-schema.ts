import { z } from "zod";

const optionalText = (max: number, label: string) => z.string().trim().max(max, `${label}ยาวเกินไป`).nullish();
const optionalInt = (label: string) =>
  z.number({ message: `${label}ต้องเป็นตัวเลข` }).int(`${label}ต้องเป็นจำนวนเต็ม`).nonnegative(`${label}ต้องไม่ติดลบ`).nullish();
const optionalFloat = (label: string) =>
  z.number({ message: `${label}ต้องเป็นตัวเลข` }).nonnegative(`${label}ต้องไม่ติดลบ`).max(1000, `${label}ไม่ถูกต้อง`).nullish();

/**
 * Student create/update input. Optional fields are normalized to null/[] by the
 * action. `classroomId`, when present, places the student in that classroom for
 * the active term. The extended fields mirror the school's DMC intake forms.
 */
export const studentSchema = z.object({
  studentCode: z.string().trim().min(1, "กรุณากรอกรหัสนักเรียน").max(20, "รหัสนักเรียนยาวเกินไป"),
  prefix: z.string().trim().max(20, "คำนำหน้ายาวเกินไป").nullable(),
  firstName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100, "ชื่อยาวเกินไป"),
  lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล").max(100, "นามสกุลยาวเกินไป"),
  gender: z.string().trim().max(20).nullable(),
  birthDate: z.date({ message: "วันเกิดไม่ถูกต้อง" }).nullable(),
  classroomId: z.string().trim().min(1).nullable(),

  // ── Identity ──
  nationalId: z
    .string()
    .trim()
    .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องมี 13 หลัก")
    .nullish(),
  firstNameEn: optionalText(100, "ชื่อภาษาอังกฤษ"),
  lastNameEn: optionalText(100, "นามสกุลภาษาอังกฤษ"),
  ethnicity: optionalText(50, "เชื้อชาติ"),
  nationality: optionalText(50, "สัญชาติ"),
  religion: optionalText(50, "ศาสนา"),
  bloodType: optionalText(5, "กรุ๊ปเลือด"),
  primaryLanguage: optionalText(50, "ภาษาหลัก"),
  email: z.string().trim().max(150, "อีเมลยาวเกินไป").email("รูปแบบอีเมลไม่ถูกต้อง").nullish(),
  phone: optionalText(30, "เบอร์โทร"),
  birthHospital: optionalText(150, "โรงพยาบาลที่เกิด"),
  birthTambon: optionalText(100, "ตำบลที่เกิด"),
  birthAmphoe: optionalText(100, "อำเภอที่เกิด"),
  birthProvince: optionalText(100, "จังหวัดที่เกิด"),
  previousSchool: optionalText(200, "สถานศึกษาเดิม"),
  studyPlan: optionalText(100, "แผนการเรียน"),

  // ── Health ──
  weightKg: optionalFloat("น้ำหนัก"),
  heightCm: optionalFloat("ส่วนสูง"),
  chronicDisease: optionalText(200, "โรคประจำตัว"),

  // ── Registered address ──
  regHouseRegNo: optionalText(20, "รหัสประจำบ้าน"),
  regHouseNo: optionalText(30, "บ้านเลขที่"),
  regMoo: optionalText(20, "หมู่ที่"),
  regSoi: optionalText(100, "ตรอก/ซอย"),
  regRoad: optionalText(100, "ถนน"),
  regTambon: optionalText(100, "ตำบล"),
  regAmphoe: optionalText(100, "อำเภอ"),
  regProvince: optionalText(100, "จังหวัด"),
  regPostalCode: optionalText(10, "รหัสไปรษณีย์"),

  // ── Current address ──
  curHouseRegNo: optionalText(20, "รหัสประจำบ้าน"),
  curHouseNo: optionalText(30, "บ้านเลขที่"),
  curMoo: optionalText(20, "หมู่ที่"),
  curSoi: optionalText(100, "ตรอก/ซอย"),
  curRoad: optionalText(100, "ถนน"),
  curTambon: optionalText(100, "ตำบล"),
  curAmphoe: optionalText(100, "อำเภอ"),
  curProvince: optionalText(100, "จังหวัด"),
  curPostalCode: optionalText(10, "รหัสไปรษณีย์"),

  // ── Commute ──
  commuteMethod: optionalText(50, "วิธีการเดินทาง"),
  commuteRoadType: optionalText(30, "ประเภทเส้นทาง"),
  commuteDistanceM: optionalInt("ระยะทาง"),
  commuteMinutes: optionalInt("ระยะเวลาเดินทาง"),

  // ── Family status ──
  parentMaritalStatus: optionalText(60, "สถานภาพบิดามารดา"),
  siblingsOlderBrothers: optionalInt("จำนวนพี่ชาย"),
  siblingsOlderSisters: optionalInt("จำนวนพี่สาว"),
  siblingsYoungerBrothers: optionalInt("จำนวนน้องชาย"),
  siblingsYoungerSisters: optionalInt("จำนวนน้องสาว"),
  birthOrder: optionalInt("เป็นบุตรคนที่"),
  dependantsCount: optionalInt("จำนวนที่อุปการะ"),

  // ── DMC classifications (multi-select) ──
  disadvantages: z.array(z.string().trim()).default([]),
  shortages: z.array(z.string().trim()).default([]),
  disabilities: z.array(z.string().trim()).default([]),
});

export type StudentInput = z.infer<typeof studentSchema>;

/** The Student table columns (placement is handled separately via Enrollment). */
export type StudentCore = Omit<StudentInput, "classroomId">;
