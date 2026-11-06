import "server-only";

import type { DailyRollCallStatus } from "@prisma/client";
import * as repo from "@/features/attendance/repositories/daily-roll-call-repository";
import type { AttendanceCalendarDay, DailyClassRoster, DailyClassSummary, DailyRollCallStatusKey } from "@/features/attendance/types";
import type { ActionResult } from "@/types/form";

function parseDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === iso ? date : null;
}

function formatName(student: { prefix: string | null; firstName: string; lastName: string }): string {
  return [student.prefix, `${student.firstName} ${student.lastName}`].filter(Boolean).join(" ");
}

export async function getDailyRollCallCalendar(month: string, advisorStaffId?: string | null): Promise<AttendanceCalendarDay[] | null> {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  const term = await repo.getActiveTerm();
  if (!term) return [];
  const classrooms = await repo.findClassrooms(term.id, term.academicYearId, advisorStaffId);
  const classroomIds = classrooms.map((classroom) => classroom.id);
  if (classroomIds.length === 0) return [];
  const [enrollments, records] = await Promise.all([
    repo.findEnrolledRoster(term.id, classroomIds),
    repo.findRecordsInRange(term.id, start, end, classroomIds),
  ]);
  const total = enrollments.length;
  const enrolledIds = new Set(enrollments.map((enrollment) => `${enrollment.classroomId}:${enrollment.studentId}`));
  const byDate = new Map<string, typeof records>();
  for (const record of records) {
    if (!enrolledIds.has(`${record.classroomId}:${record.studentId}`)) continue;
    const iso = record.date.toISOString().slice(0, 10);
    const group = byDate.get(iso) ?? [];
    group.push(record);
    byDate.set(iso, group);
  }
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index): AttendanceCalendarDay => {
    const date = new Date(Date.UTC(year, monthIndex, index + 1));
    const iso = date.toISOString().slice(0, 10);
    const saved = byDate.get(iso) ?? [];
    const isWeekday = date.getUTCDay() > 0 && date.getUTCDay() < 6;
    const hasSession = isWeekday || saved.length > 0;
    const checked = saved.length;
    return {
      date: iso,
      total,
      checked,
      unchecked: Math.max(0, total - checked),
      late: saved.filter((row) => row.status === "LATE").length,
      state: !hasSession ? "no-session" : checked === 0 ? "empty" : checked >= total ? "complete" : "partial",
    };
  });
}

export async function getDailyRollCallOverview(dateISO: string, advisorStaffId?: string | null): Promise<DailyClassSummary[] | null> {
  const date = parseDate(dateISO);
  if (!date) return null;
  const term = await repo.getActiveTerm();
  if (!term) return [];

  const classrooms = await repo.findClassrooms(term.id, term.academicYearId, advisorStaffId);
  const [records, classroomStudents] = await Promise.all([
    repo.findRecords(term.id, date, classrooms.map((classroom) => classroom.id)),
    Promise.all(classrooms.map(async (classroom) => [classroom.id, await repo.findEnrolledStudents(term.id, classroom.id)] as const)),
  ]);
  const totals = new Map(classroomStudents.map(([id, students]) => [id, students.length]));
  const counts = new Map<string, Record<DailyRollCallStatusKey, number>>();
  for (const record of records) {
    const classroomCounts = counts.get(record.classroomId) ?? {
      PRESENT: 0,
      LATE: 0,
      ABSENT: 0,
      SICK_LEAVE: 0,
      PERSONAL_LEAVE: 0,
    };
    classroomCounts[record.status] += 1;
    counts.set(record.classroomId, classroomCounts);
  }

  return classrooms.map((classroom) => {
    const total = totals.get(classroom.id) ?? 0;
    const saved = counts.get(classroom.id) ?? { PRESENT: 0, LATE: 0, ABSENT: 0, SICK_LEAVE: 0, PERSONAL_LEAVE: 0 };
    const checked = saved.PRESENT + saved.LATE + saved.ABSENT + saved.SICK_LEAVE + saved.PERSONAL_LEAVE;
    return {
      classroomId: classroom.id,
      classroomCode: classroom.code,
      gradeLevel: classroom.gradeLevel,
      total,
      present: saved.PRESENT,
      late: saved.LATE,
      absent: saved.ABSENT,
      sickLeave: saved.SICK_LEAVE,
      personalLeave: saved.PERSONAL_LEAVE,
      unchecked: Math.max(0, total - checked),
    };
  });
}

export async function getDailyClassRoster(
  dateISO: string,
  classroomId: string,
  advisorStaffId?: string | null,
): Promise<DailyClassRoster | null> {
  const date = parseDate(dateISO);
  if (!date) return null;
  const term = await repo.getActiveTerm();
  if (!term) return null;
  const classrooms = await repo.findClassrooms(term.id, term.academicYearId, advisorStaffId);
  const classroom = classrooms.find((row) => row.id === classroomId);
  if (!classroom) return null;

  const [students, records] = await Promise.all([
    repo.findEnrolledStudents(term.id, classroomId),
    repo.findRecords(term.id, date, [classroomId]),
  ]);
  const statusByStudent = new Map(records.map((record) => [record.studentId, record.status as DailyRollCallStatusKey]));
  return {
    date: dateISO,
    classroomId,
    classroomCode: classroom.code,
    students: students.map((student) => ({
      studentId: student.id,
      code: student.studentCode,
      name: formatName(student),
      status: statusByStudent.get(student.id) ?? null,
    })),
  };
}

export async function saveDailyRollCall(
  userId: string,
  dateISO: string,
  classroomId: string,
  entries: { studentId: string; status: DailyRollCallStatusKey }[],
  advisorStaffId?: string | null,
): Promise<ActionResult> {
  const date = parseDate(dateISO);
  if (!date) return { ok: false, message: "วันที่ไม่ถูกต้อง" };
  const term = await repo.getActiveTerm();
  if (!term) return { ok: false, message: "ยังไม่ได้ตั้งค่าภาคเรียนที่ใช้งาน" };
  const classrooms = await repo.findClassrooms(term.id, term.academicYearId, advisorStaffId);
  if (!classrooms.some((classroom) => classroom.id === classroomId)) {
    return { ok: false, message: "คุณไม่มีสิทธิ์เช็คชื่อห้องนี้" };
  }
  const students = await repo.findEnrolledStudents(term.id, classroomId);
  const enrolledIds = new Set(students.map((student) => student.id));
  if (entries.some((entry) => !enrolledIds.has(entry.studentId))) {
    return { ok: false, message: "รายชื่อนักเรียนไม่ตรงกับห้องที่เลือก กรุณาโหลดหน้าใหม่" };
  }
  const recordedById = await repo.findRecorderStaffId(userId);
  await repo.upsertRecords({
    termId: term.id,
    classroomId,
    date,
    recordedById,
    entries: entries.map((entry) => ({ studentId: entry.studentId, status: entry.status as DailyRollCallStatus })),
  });
  return { ok: true, message: "บันทึกการเช็คชื่อเรียบร้อย" };
}
