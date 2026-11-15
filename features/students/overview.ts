import type { EnrollmentStatus } from "@prisma/client";
import type { EnrolmentStatus } from "@/features/dashboard/types";
export type StudentGender = "male" | "female" | "other";
export interface RosterStudent { id: string; code: string; firstName: string; lastName: string; gender: string | null; classroomId: string | null; status: EnrollmentStatus | null }
export interface RosterClassroom { id: string; code: string; gradeLevel: string }
export interface StudentListFilters { search: string; filter: "all" | EnrolmentStatus; classroom: string; gender: "all" | StudentGender; grade: string }
export interface StudentCounts { total: number; male: number; female: number; other: number; active: number; pending: number; leave: number; unassigned: number }
export interface StudentOverview { term: string | null; overall: StudentCounts; rooms: (RosterClassroom & StudentCounts)[]; grades: string[] }
export function studentGender(value: string | null): StudentGender {
  const normalized = value?.trim().toLowerCase();
  return ["ชาย", "male", "m"].includes(normalized ?? "") ? "male" : ["หญิง", "female", "f"].includes(normalized ?? "") ? "female" : "other";
}
export function countRoster(rows: RosterStudent[]): StudentCounts {
  const students = [...new Map(rows.map(row => [row.id, row])).values()];
  return { total: students.length, male: students.filter(row => studentGender(row.gender) === "male").length, female: students.filter(row => studentGender(row.gender) === "female").length, other: students.filter(row => studentGender(row.gender) === "other").length,
    active: students.filter(row => row.status === "ACTIVE").length, pending: students.filter(row => row.status === "PENDING").length, leave: students.filter(row => row.status === "LEAVE").length, unassigned: students.filter(row => !row.classroomId).length };
}
export function buildStudentOverview(rows: RosterStudent[], rooms: RosterClassroom[], term: string | null): StudentOverview {
  return { term, overall: countRoster(rows), rooms: [...rooms].sort((a, b) => a.code.localeCompare(b.code, "th", { numeric: true })).map(room => ({ ...room, ...countRoster(rows.filter(row => row.classroomId === room.id)) })), grades: [...new Set(rooms.map(room => room.gradeLevel))].sort((a, b) => a.localeCompare(b, "th", { numeric: true })) };
}
export function filterRoster(rows: RosterStudent[], rooms: RosterClassroom[], filters: StudentListFilters): RosterStudent[] {
  const search = filters.search.trim().replace(/\s+/g, " ").normalize("NFC").toLocaleLowerCase();
  const gradeRooms = new Set(rooms.filter(room => room.gradeLevel === filters.grade).map(room => room.id));
  return rows.filter(row => (filters.filter === "all" || row.status === filters.filter.toUpperCase()) &&
    (!filters.classroom || (filters.classroom === "unassigned" ? !row.classroomId : row.classroomId === filters.classroom)) &&
    (filters.gender === "all" || studentGender(row.gender) === filters.gender) &&
    (!filters.grade || (row.classroomId !== null && gradeRooms.has(row.classroomId))) &&
    (!search || `${row.code} ${row.firstName} ${row.lastName}`.normalize("NFC").toLocaleLowerCase().includes(search)));
}
export function studentOverviewHref(params: Record<string, string>): string {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value && value !== "all"));
  return `/dashboard/students${query.size ? `?${query}` : ""}#student-roster`;
}
