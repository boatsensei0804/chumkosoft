export type TermStatus = "UPCOMING" | "ACTIVE" | "CLOSED";

export interface TermSetting {
  id: string;
  number: number;
  name: string;
  startDate: string; // "YYYY-MM-DD" — วันเปิดภาคเรียน
  endDate: string; // วันปิดภาคเรียน
  status: TermStatus;
  isActive: boolean; // the current working term
}

export interface AcademicYearSetting {
  id: string;
  buddhistYear: number;
  startDate: string;
  endDate: string;
  isActive: boolean; // the current working year
  terms: TermSetting[];
}

export interface PeriodSetting {
  id: string;
  label: string;
  startTime: string; // "HH:MM"
  endTime: string;
  isBreak: boolean;
}
