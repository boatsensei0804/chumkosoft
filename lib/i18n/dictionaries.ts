import type { Locale } from "@/lib/i18n/config";

/**
 * i18n dictionaries. Thai is the source of truth (the primary audience) and
 * defines the shape; English `satisfies Dictionary` so it can never drift out of
 * key parity. This is the foundation — surfaces are migrated onto `t()` over time,
 * starting with the login screen and shared actions.
 */
const th = {
  common: {
    appName: "chumkosoft",
    tagline: "ระบบบริหารจัดการโรงเรียน",
    save: "บันทึก",
    cancel: "ยกเลิก",
    delete: "ลบ",
    edit: "แก้ไข",
    add: "เพิ่ม",
    search: "ค้นหา",
    signOut: "ออกจากระบบ",
    language: "ภาษา",
  },
  login: {
    title: "เข้าสู่ระบบ",
    subtitle: "ลงชื่อเข้าใช้เพื่อจัดการข้อมูลของสถานศึกษา",
    identifier: "อีเมลหรือเลขบัตรประชาชน",
    password: "รหัสผ่าน",
    submit: "เข้าสู่ระบบ",
    submitting: "กำลังเข้าสู่ระบบ…",
    footer: "© 2568 chumkosoft · ระบบบริหารจัดการโรงเรียน",
  },
  nav: {
    section_manage: "การจัดการ",
    section_system: "ระบบ",
  },
};

export type Dictionary = typeof th;

const en = {
  common: {
    appName: "chumkosoft",
    tagline: "School management system",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    signOut: "Sign out",
    language: "Language",
  },
  login: {
    title: "Sign in",
    subtitle: "Sign in to manage your school's records",
    identifier: "Email or national ID",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    footer: "© 2025 chumkosoft · School management system",
  },
  nav: {
    section_manage: "Management",
    section_system: "System",
  },
} satisfies Dictionary;

export const dictionaries: Record<Locale, Dictionary> = { th, en };
