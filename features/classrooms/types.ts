export interface AdvisorRef {
  id: string;
  name: string;
}

export interface ClassroomRow {
  id: string;
  code: string;
  gradeLevel: string;
  advisors: AdvisorRef[];
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
  courseId: string;
  teacherId: string;
  roomId: string;
  courseCode: string;
  courseName: string;
  teacher: string;
  room: string;
  periodsPerWeek: number;
  scheduledCount: number;
}

export interface AdvisorDetail {
  name: string;
  position: string | null;
}

export interface ClassroomDetail {
  id: string;
  code: string;
  gradeLevel: string;
  advisors: AdvisorDetail[];
  termLabel: string | null;
  roster: RosterEntry[];
  offerings: OfferingRow[];
}
