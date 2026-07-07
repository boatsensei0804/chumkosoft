/**
 * Option lists for the student intake form, transcribed from the school's DMC
 * data-collection forms. Stored on Student as free strings / string arrays, so
 * these drive the UI only (no DB enum) and stay easy to amend.
 */

export const BLOOD_TYPES = ["A", "B", "AB", "O"] as const;

export const RELIGIONS = ["พุทธ", "อิสลาม", "คริสต์", "ฮินดู", "ซิกข์", "อื่น ๆ"] as const;

export const STUDY_PLANS = ["วิทยาศาสตร์ - คณิตศาสตร์", "อุตสาหกรรมศิลป์ - ภาษา"] as const;

export const COMMUTE_METHODS = [
  "เดินเท้า",
  "พาหนะเสียค่าโดยสาร",
  "พาหนะไม่เสียค่าโดยสาร",
  "จักรยานยืมเรียน",
] as const;

export const COMMUTE_ROAD_TYPES = ["ถนนลูกรัง", "ถนนลาดยาง", "ทางน้ำ"] as const;

export const PARENT_MARITAL_STATUSES = [
  "สมรส",
  "โสด",
  "หม้าย",
  "หย่าร้าง",
  "อยู่ด้วยกัน",
  "แยกกันอยู่",
  "บิดาถึงแก่กรรม",
  "มารดาถึงแก่กรรม",
  "บิดาและมารดาถึงแก่กรรม",
  "บิดาถึงแก่กรรม มารดาแต่งงานใหม่",
  "มารดาถึงแก่กรรม บิดาแต่งงานใหม่",
] as const;

export const DISADVANTAGES = [
  "เด็กถูกบังคับให้ขายแรงงาน",
  "เด็กที่อยู่ในธุรกิจทางเพศ",
  "เด็กถูกทอดทิ้ง",
  "เด็กในสถานพินิจและคุ้มครองเด็กและเยาวชน",
  "เด็กเร่ร่อน",
  "ผลกระทบจากเอดส์",
  "ชนกลุ่มน้อย",
  "เด็กที่ถูกทำร้ายทารุณ",
  "เด็กยากจน",
  "เด็กที่มีปัญหาเกี่ยวกับยาเสพติด",
  "ทำงานรับผิดชอบตนเองและครอบครัว",
  "กำพร้า",
  "อื่น ๆ",
] as const;

export const SHORTAGES = ["อาหารกลางวัน", "เครื่องแบบนักเรียน", "แบบเรียน", "เครื่องเขียน"] as const;

export const DISABILITIES = [
  "ทางการมองเห็น",
  "ทางการได้ยิน",
  "ทางสติปัญญา",
  "ทางร่างกาย/สุขภาพ",
  "ทางการเรียนรู้",
  "ทางการพูด/ภาษา",
  "ทางพฤติกรรมและอารมณ์",
  "ออทิสติก",
  "พิการซ้อน",
  "อื่น ๆ",
] as const;

export const GUARDIAN_RELATIONS = ["บิดา", "มารดา", "ผู้ปกครอง"] as const;
