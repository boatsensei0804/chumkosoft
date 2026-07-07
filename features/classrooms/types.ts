export interface ClassroomRow {
  id: string;
  code: string;
  gradeLevel: string;
  homeroomTeacherId: string | null;
  homeroomTeacher: string | null;
  studentCount: number;
  offeringCount: number;
}

export interface TeacherOption {
  id: string;
  name: string;
}

export interface LabeledOption {
  id: string;
  label: string;
}

export interface OfferingOptions {
  courses: LabeledOption[];
  teachers: TeacherOption[];
  rooms: LabeledOption[];
}

export type RosterStatus = "active" | "pending" | "leave";

export interface RosterEntry {
  id: string;
  code: string;
  name: string;
  status: RosterStatus;
}

export interface OfferingRow {
  id: string;
  courseCode: string;
  courseName: string;
  teacher: string;
  room: string;
  periodsPerWeek: number;
}

export interface ClassroomDetail {
  id: string;
  code: string;
  gradeLevel: string;
  homeroomTeacherId: string | null;
  homeroomTeacher: string | null;
  homeroomTeacherPosition: string | null;
  termLabel: string | null;
  roster: RosterEntry[];
  offerings: OfferingRow[];
}
