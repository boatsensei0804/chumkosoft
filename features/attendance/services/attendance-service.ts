import "server-only";

import type { DayOfWeek } from "@prisma/client";
import * as repo from "@/features/attendance/repositories/attendance-repository";
import type { SaveAttendanceInput } from "@/features/attendance/schemas/attendance-schema";
import type { AttendanceCalendarDay, AttendanceOffering, AttendanceRoster, AttendanceStatusKey, RosterStudent } from "@/features/attendance/types";
import type { ActionResult } from "@/types/form";

const WEEKDAY_BY_INDEX: Record<number, DayOfWeek> = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
};

/** Parses "yyyy-mm-dd" to a stable UTC-midnight Date + its weekday enum. */
function parseCalendarDate(iso: string): { date: Date; day: DayOfWeek } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) return null;
  return { date, day: WEEKDAY_BY_INDEX[date.getUTCDay()] };
}

function formatName(s: { prefix: string | null; firstName: string; lastName: string }): string {
  return [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
}

function monthRange(month: string): { start: Date; end: Date; year: number; monthIndex: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
    year,
    monthIndex,
  };
}

/** Persisted roll-call counts for each scheduled day in a month. */
export async function getAttendanceCalendar(
  offeringId: string,
  month: string,
  teacherStaffId?: string | null,
): Promise<AttendanceCalendarDay[] | null> {
  const range = monthRange(month);
  if (!range) return null;

  const [term, offering] = await Promise.all([repo.getActiveTerm(), repo.getOfferingRef(offeringId)]);
  if (!term || !offering || offering.termId !== term.id) return null;
  if (teacherStaffId && offering.teacherId !== teacherStaffId) return null;

  const [students, records, weekdays] = await Promise.all([
    repo.findEnrolledStudents(offering.classroomId, term.id),
    repo.findAttendanceInRange(offeringId, range.start, range.end),
    repo.findScheduledWeekdays(offeringId),
  ]);
  const total = students.length;
  const byDate = new Map<string, typeof records>();
  for (const record of records) {
    const key = record.date.toISOString().slice(0, 10);
    const group = byDate.get(key) ?? [];
    group.push(record);
    byDate.set(key, group);
  }

  const scheduled = new Set(weekdays);
  const numberOfDays = new Date(Date.UTC(range.year, range.monthIndex + 1, 0)).getUTCDate();
  return Array.from({ length: numberOfDays }, (_, index): AttendanceCalendarDay => {
    const date = new Date(Date.UTC(range.year, range.monthIndex, index + 1));
    const iso = date.toISOString().slice(0, 10);
    const saved = byDate.get(iso) ?? [];
    const hasSession = scheduled.has(WEEKDAY_BY_INDEX[date.getUTCDay()]) || saved.length > 0;
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

/**
 * Course offerings in the active term, labelled "ชั้น · วิชา".
 * `teacherStaffId` scopes to one teacher's classes (null/undefined = admin, sees all).
 */
export async function listAttendanceOfferings(teacherStaffId?: string | null): Promise<AttendanceOffering[]> {
  const term = await repo.getActiveTerm();
  if (!term) return [];
  const offerings = await repo.findOfferingsForTerm(term.id, teacherStaffId);
  return offerings.map((o) => ({ id: o.id, label: `${o.classroom.code} · ${o.course.name}` }));
}

/**
 * Builds the roster (with any saved statuses) for one offering on one date.
 * When `teacherStaffId` is given, a non-owned offering returns null so a teacher
 * can't open another teacher's roster by editing the URL.
 */
export async function getRoster(offeringId: string, dateISO: string, teacherStaffId?: string | null): Promise<AttendanceRoster | null> {
  const parsed = parseCalendarDate(dateISO);
  if (!parsed) return null;

  const [term, offering] = await Promise.all([repo.getActiveTerm(), repo.getOfferingRef(offeringId)]);
  if (!term || !offering || offering.termId !== term.id) return null;
  if (teacherStaffId && offering.teacherId !== teacherStaffId) return null;

  const meeting = await repo.findMeetingPeriod(offeringId, parsed.day);
  const fallback = meeting ? null : await repo.findAnyPeriod(offeringId);
  const periodLabel = meeting?.period.label ?? fallback?.period.label ?? null;
  const schedulable = meeting !== null || fallback !== null;

  const [students, existing] = await Promise.all([
    repo.findEnrolledStudents(offering.classroomId, term.id),
    repo.findAttendance(offeringId, parsed.date),
  ]);

  const savedByStudent = new Map(existing.map((e) => [e.studentId, e]));

  const roster: RosterStudent[] = students.map((s) => {
    const saved = savedByStudent.get(s.id);
    return {
      studentId: s.id,
      code: s.studentCode,
      name: formatName(s),
      status: (saved?.status as AttendanceStatusKey | undefined) ?? "PRESENT",
      note: saved?.note ?? null,
    };
  });

  return {
    offeringId,
    date: dateISO,
    periodLabel,
    meetsOnDay: meeting !== null,
    schedulable,
    students: roster,
  };
}

/**
 * Persists a roster's statuses; resolves the meeting period and recorder.
 * `teacherStaffId` (non-admin) blocks saving a roster that isn't the teacher's own.
 */
export async function saveRoster(userId: string, input: SaveAttendanceInput, teacherStaffId?: string | null): Promise<ActionResult> {
  const parsed = parseCalendarDate(input.date);
  if (!parsed) return { ok: false, message: "วันที่ไม่ถูกต้อง" };

  const [term, offering] = await Promise.all([repo.getActiveTerm(), repo.getOfferingRef(input.offeringId)]);
  if (!term || !offering || offering.termId !== term.id) {
    return { ok: false, message: "ไม่พบรายวิชาในภาคเรียนที่ใช้งาน" };
  }
  if (teacherStaffId && offering.teacherId !== teacherStaffId) {
    return { ok: false, message: "บันทึกไม่ได้ เพราะรายวิชานี้ไม่ใช่วิชาที่คุณสอน" };
  }

  const meeting = await repo.findMeetingPeriod(input.offeringId, parsed.day);
  const fallback = meeting ? null : await repo.findAnyPeriod(input.offeringId);
  const periodId = meeting?.periodId ?? fallback?.periodId ?? null;
  if (!periodId) {
    return { ok: false, message: "รายวิชานี้ยังไม่มีคาบเรียนในตาราง จึงบันทึกการเช็คชื่อไม่ได้" };
  }

  const recordedById = await repo.getStaffIdForUser(userId);

  await repo.upsertAttendance(
    { termId: term.id, offeringId: input.offeringId, periodId, date: parsed.date, recordedById },
    input.entries.map((e) => ({ studentId: e.studentId, status: e.status, note: e.note })),
  );

  return { ok: true, message: "บันทึกการเช็คชื่อเรียบร้อย" };
}
