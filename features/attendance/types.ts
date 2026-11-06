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

export type CalendarRecordState = "complete" | "partial" | "empty" | "no-session";

export const DAILY_ROLL_CALL_STATUSES = ["PRESENT", "LATE", "ABSENT", "SICK_LEAVE", "PERSONAL_LEAVE"] as const;
export type DailyRollCallStatusKey = (typeof DAILY_ROLL_CALL_STATUSES)[number];

export const DAILY_ROLL_CALL_LABELS: Record<DailyRollCallStatusKey, string> = {
  PRESENT: "มา",
  LATE: "มาสาย",
  ABSENT: "ขาดเรียน",
  SICK_LEAVE: "ลาป่วย",
  PERSONAL_LEAVE: "ลากิจ",
};

export interface AttendanceCalendarDay {
  date: string;
  total: number;
  checked: number;
  unchecked: number;
  late: number;
  state: CalendarRecordState;
}

export interface DailyClassSummary {
  classroomId: string;
  classroomCode: string;
  gradeLevel: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  sickLeave: number;
  personalLeave: number;
  unchecked: number;
}

export interface DailyRollCallStudent {
  studentId: string;
  code: string;
  name: string;
  status: DailyRollCallStatusKey | null;
}

export interface DailyClassRoster {
  date: string;
  classroomId: string;
  classroomCode: string;
  students: DailyRollCallStudent[];
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
