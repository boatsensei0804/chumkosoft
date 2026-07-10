import "server-only";

import * as repo from "@/features/attendance/repositories/school-entry-repository";
import { getScanSetting } from "@/features/kiosk/repositories/kiosk-repository";
import type { ClassroomOption, SchoolEntryRoster, SchoolEntryState, SchoolEntryStudent } from "@/features/attendance/types";
import type { ActionResult } from "@/types/form";

/** Parses "yyyy-mm-dd" to a stable UTC-midnight Date. */
function parseCalendarDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function bangkokTime(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatName(s: { prefix: string | null; firstName: string; lastName: string }): string {
  return [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
}

/** Classroom filter options. `advisorStaffId` limits to a teacher's homeroom(s); null = admin (all). */
export async function listEntryClassrooms(advisorStaffId?: string | null): Promise<ClassroomOption[]> {
  return repo.findClassroomsForActiveYear(advisorStaffId);
}

/**
 * Daily gate roster for a date (optionally one classroom).
 * `advisorStaffId` restricts to a teacher's advisory classrooms (null = admin, all).
 */
export async function getSchoolEntryRoster(dateISO: string, classroomId: string, advisorStaffId?: string | null): Promise<SchoolEntryRoster | null> {
  const date = parseCalendarDate(dateISO);
  if (!date) return null;

  const term = await repo.getActiveTerm();
  if (!term) return { date: dateISO, classroomId, students: [] };

  const [students, entries] = await Promise.all([
    repo.findEnrolledStudents(term.id, classroomId || undefined, advisorStaffId),
    repo.findEntries(term.id, date),
  ]);

  const byStudent = new Map(entries.map((e) => [e.studentId, e]));

  const roster: SchoolEntryStudent[] = students.map((s) => {
    const entry = byStudent.get(s.id);
    const checkInAt = bangkokTime(entry?.checkInAt ?? null);
    const checkOutAt = bangkokTime(entry?.checkOutAt ?? null);
    const state: SchoolEntryState = checkOutAt ? "OUT" : checkInAt ? "IN" : "ABSENT";
    return {
      studentId: s.id,
      code: s.studentCode,
      name: formatName(s),
      classroomCode: s.classroomCode,
      checkInAt,
      checkOutAt,
      isLate: entry?.isLate ?? false,
      state,
    };
  });

  return { date: dateISO, classroomId, students: roster };
}

async function resolveContext(studentId: string, dateISO: string): Promise<{ termId: string; date: Date } | ActionResult> {
  const date = parseCalendarDate(dateISO);
  if (!date) return { ok: false, message: "วันที่ไม่ถูกต้อง" };
  const term = await repo.getActiveTerm();
  if (!term) return { ok: false, message: "ยังไม่ได้ตั้งค่าภาคเรียนที่ใช้งาน" };
  const enrolled = await repo.getStudentTermRef(studentId, term.id);
  if (!enrolled) return { ok: false, message: "นักเรียนคนนี้ไม่ได้ลงทะเบียนในภาคเรียนปัจจุบัน" };
  return { termId: term.id, date };
}

export async function checkInStudent(studentId: string, dateISO: string): Promise<ActionResult> {
  const ctx = await resolveContext(studentId, dateISO);
  if ("ok" in ctx) return ctx;
  // Same late criterion as the face-scan gate: check-in time-of-day ≥ late cutoff.
  const now = new Date();
  const setting = await getScanSetting();
  const isLate = (bangkokTime(now) ?? "") >= setting.lateAfterTime;
  await repo.upsertCheckIn(ctx.termId, studentId, ctx.date, now, isLate);
  return { ok: true, message: isLate ? "บันทึกเวลาเข้า (มาสาย) เรียบร้อย" : "บันทึกเวลาเข้าเรียบร้อย" };
}

export async function checkOutStudent(studentId: string, dateISO: string): Promise<ActionResult> {
  const ctx = await resolveContext(studentId, dateISO);
  if ("ok" in ctx) return ctx;
  await repo.upsertCheckOut(ctx.termId, studentId, ctx.date, new Date());
  return { ok: true, message: "บันทึกเวลาออกเรียบร้อย" };
}
