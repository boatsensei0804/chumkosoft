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
