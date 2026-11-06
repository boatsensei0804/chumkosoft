export type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI";

export interface DayInfo {
  key: DayKey;
  label: string;
  short: string;
}

export interface PeriodRow {
  id: string;
  index: number;
  label: string;
  start: string;
  end: string;
  kind: "class" | "break";
}

export type SubjectColor =
  | "blue"
  | "teal"
  | "green"
  | "amber"
  | "purple"
  | "rose"
  | "cyan"
  | "indigo";

/** A course offered to this class this term — the draggable unit. */
export interface Offering {
  id: string;
  classroomId?: string;
  classroomCode?: string;
  courseCode: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  roomId: string;
  roomName: string;
  color: SubjectColor;
  periodsPerWeek: number;
}

/** A placed cell in the timetable grid. */
export interface PlacedSlot {
  id: string;
  offeringId: string;
  day: DayKey;
  periodId: string;
}

/** Teacher/room occupancy coming from OTHER classes (read-only conflicts). */
export interface ExternalBusy {
  day: DayKey;
  periodId: string;
  classroomIds?: string[];
  teacherIds: string[];
  roomIds: string[];
}

/** Selectable option in the context-bar term/classroom pickers. */
export interface ContextOption {
  id: string;
  label: string;
}

export interface ScheduleOverviewSlot {
  id: string;
  offeringId: string;
  classroomId: string;
  classroomCode: string;
  teacherId: string;
  teacherName: string;
  courseCode: string;
  courseName: string;
  roomName: string;
  roomId: string;
  day: DayKey;
  periodId: string;
}

export interface ScheduleOverviewTeacher {
  id: string;
  name: string;
}

export interface ScheduleOverviewClassroom {
  id: string;
  code: string;
  gradeLevel: string;
  requiredPeriods: number;
  slots: number;
}

export interface ScheduleOverviewData {
  classrooms: ScheduleOverviewClassroom[];
  teachers: ScheduleOverviewTeacher[];
  slots: ScheduleOverviewSlot[];
  offerings: Offering[];
  requiredPeriods: number;
  placedPeriods: number;
}

export type ConflictKind = "class" | "teacher" | "room";

export interface ConflictResult {
  ok: boolean;
  kind?: ConflictKind;
  reason?: string;
}
