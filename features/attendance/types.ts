export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE", "EXCUSED"] as const;
export type AttendanceStatusKey = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_LABELS: Record<AttendanceStatusKey, string> = {
  PRESENT: "มา",
  ABSENT: "ขาด",
  LATE: "สาย",
  LEAVE: "ลา",
  EXCUSED: "ได้รับอนุญาต",
};

export interface AttendanceOffering {
  id: string;
  label: string;
}

export interface RosterStudent {
  studentId: string;
  code: string;
  name: string;
  status: AttendanceStatusKey;
  note: string | null;
}

export interface AttendanceRoster {
  offeringId: string;
  date: string;
  /** Label of the period this offering meets in (resolved from the timetable). */
  periodLabel: string | null;
  /** Whether the class is actually scheduled on the chosen weekday. */
  meetsOnDay: boolean;
  /** False when the offering has no timetable slot at all — attendance can't be saved. */
  schedulable: boolean;
  students: RosterStudent[];
}

export interface ClassroomOption {
  id: string;
  code: string;
  gradeLevel: string;
}

export type SchoolEntryState = "ABSENT" | "IN" | "OUT";

export interface SchoolEntryStudent {
  studentId: string;
  code: string;
  name: string;
  classroomCode: string;
  /** Bangkok HH:mm, or null. */
  checkInAt: string | null;
  checkOutAt: string | null;
  /** Checked in at/after the school's late cutoff. */
  isLate: boolean;
  state: SchoolEntryState;
}

export interface SchoolEntryRoster {
  date: string;
  classroomId: string;
  students: SchoolEntryStudent[];
}
