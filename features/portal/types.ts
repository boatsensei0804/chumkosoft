export type PortalDayKey = "MON" | "TUE" | "WED" | "THU" | "FRI";

export interface PortalDay {
  key: PortalDayKey;
  label: string;
  short: string;
}

export interface PortalCell {
  subject: string;
  room: string;
  teacher: string;
}

export interface PortalPeriodRow {
  periodId: string;
  label: string;
  start: string;
  end: string;
  isBreak: boolean;
  cells: Record<PortalDayKey, PortalCell | null>;
}

export interface PortalOverview {
  studentName: string | null;
  classroomCode: string | null;
  gradeLevel: string | null;
  termLabel: string | null;
  days: PortalDay[];
  periods: PortalPeriodRow[];
  /** True when the viewer has a resolvable class schedule to show. */
  hasSchedule: boolean;
}
