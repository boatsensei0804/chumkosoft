import type { Role } from "@prisma/client";

export type EnrolmentStatus = "active" | "pending" | "leave";

export interface StudentSummary {
  id: string;
  code: string;
  prefix: string | null;
  firstName: string;
  lastName: string;
  gender: string | null;
  /** ISO yyyy-MM-dd for date inputs, or null. */
  birthDate: string | null;
  classroom: string;
  currentClassroomId: string | null;
  grade: string;
  enrolledAt: string;
  status: EnrolmentStatus;

  // ── DMC intake record (all optional) ──
  nationalId: string | null;
  firstNameEn: string | null;
  lastNameEn: string | null;
  ethnicity: string | null;
  nationality: string | null;
  religion: string | null;
  bloodType: string | null;
  primaryLanguage: string | null;
  email: string | null;
  phone: string | null;
  birthHospital: string | null;
  birthTambon: string | null;
  birthAmphoe: string | null;
  birthProvince: string | null;
  previousSchool: string | null;
  studyPlan: string | null;
  weightKg: number | null;
  heightCm: number | null;
  chronicDisease: string | null;
  regHouseRegNo: string | null;
  regHouseNo: string | null;
  regMoo: string | null;
  regSoi: string | null;
  regRoad: string | null;
  regTambon: string | null;
  regAmphoe: string | null;
  regProvince: string | null;
  regPostalCode: string | null;
  curHouseRegNo: string | null;
  curHouseNo: string | null;
  curMoo: string | null;
  curSoi: string | null;
  curRoad: string | null;
  curTambon: string | null;
  curAmphoe: string | null;
  curProvince: string | null;
  curPostalCode: string | null;
  commuteMethod: string | null;
  commuteRoadType: string | null;
  commuteDistanceM: number | null;
  commuteMinutes: number | null;
  parentMaritalStatus: string | null;
  siblingsOlderBrothers: number | null;
  siblingsOlderSisters: number | null;
  siblingsYoungerBrothers: number | null;
  siblingsYoungerSisters: number | null;
  birthOrder: number | null;
  dependantsCount: number | null;
  disadvantages: string[];
  shortages: string[];
  disabilities: string[];
}

export interface StudentGuardian {
  id: string;
  fullName: string;
  relation: string;
  prefix: string | null;
  nationalId: string | null;
  occupation: string | null;
  monthlyIncome: number | null;
  bloodType: string | null;
  phone: string | null;
  linked: boolean;
}

export interface StudentDetail extends StudentSummary {
  faceConsent: boolean;
  guardians: StudentGuardian[];
}

export interface ClassroomOption {
  id: string;
  code: string;
  gradeLevel: string;
}

export interface Figure {
  key: string;
  label: string;
  value: number;
  unit?: string;
  deltaPct: number;
  caption: string;
}

export interface ScheduleItem {
  id: string;
  start: string;
  end: string;
  subject: string;
  classroom: string;
  teacher: string;
  room: string;
  now?: boolean;
}

export type AnnouncementKind = "info" | "warning" | "success";

export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  postedBy: string;
  postedAt: string;
}

export interface EnrolmentPoint {
  month: string;
  value: number;
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  badge?: number;
  available: boolean;
  /** Roles allowed to see this item. Undefined = visible to every staff role. */
  roles?: Role[];
}
