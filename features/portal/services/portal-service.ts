import "server-only";

import type { Role } from "@prisma/client";
import { getPeriods } from "@/repositories/timetable-repository";
import {
  listPortalStudents,
  findPortalEntries,
  findActivePlacement,
  findWeeklySlots,
} from "@/features/portal/repositories/portal-repository";
import type { PortalDay, PortalDayKey, PortalOverview, PortalPeriodRow } from "@/features/portal/types";

const DAYS: PortalDay[] = [
  { key: "MON", label: "จันทร์", short: "จ." },
  { key: "TUE", label: "อังคาร", short: "อ." },
  { key: "WED", label: "พุธ", short: "พ." },
  { key: "THU", label: "พฤหัสบดี", short: "พฤ." },
  { key: "FRI", label: "ศุกร์", short: "ศ." },
];

function formatTeacher(t: { prefix: string | null; firstName: string; lastName: string }): string {
  return [t.prefix, `${t.firstName} ${t.lastName}`].filter(Boolean).join(" ");
}

function formatRoom(r: { code: string; name: string | null; building: string | null }): string {
  if (r.name) return r.name;
  return r.building ? `${r.building} · ${r.code}` : r.code;
}

function formatStudentName(s: { prefix: string | null; firstName: string; lastName: string }): string {
  return [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
}

const EMPTY_OVERVIEW: PortalOverview = {
  studentName: null,
  classroomCode: null,
  gradeLevel: null,
  termLabel: null,
  days: DAYS,
  periods: [],
  hasSchedule: false,
};

/** Assembles the read-only weekly class schedule for a portal viewer. */
export async function getPortalOverview(userId: string, role: Role, today: string, requestedStudentId?: string) {
  const students = await listPortalStudents(userId, role);
  const options = students.map((student) => ({ id: student.id, name: formatStudentName(student) }));
  const student = requestedStudentId
    ? students.find((candidate) => candidate.id === requestedStudentId)
    : students[0];
  if (!student) return {
    overview: EMPTY_OVERVIEW, options, selectedId: null, entry: null,
    unavailable: Boolean(requestedStudentId),
  };

  const studentName = formatStudentName(student);
  const placement = await findActivePlacement(student.id);
  const selection = { options, selectedId: student.id, unavailable: false };
  if (!placement) return {
    ...selection, overview: { ...EMPTY_OVERVIEW, studentName }, entry: null,
  };

  const [periodRows, slots, entry] = await Promise.all([
    getPeriods(),
    findWeeklySlots(placement.termId, placement.classroomId),
    findPortalEntries(placement.termId, student.id, new Date(`${today}T00:00:00Z`)),
  ]);

  const byCell = new Map<string, { subject: string; room: string; teacher: string }>();
  for (const slot of slots) {
    byCell.set(`${slot.dayOfWeek}:${slot.periodId}`, {
      subject: slot.courseOffering.course.name,
      room: formatRoom(slot.courseOffering.room),
      teacher: formatTeacher(slot.courseOffering.teacher),
    });
  }

  const periods: PortalPeriodRow[] = periodRows.map((p) => {
    const cells = {} as PortalPeriodRow["cells"];
    for (const day of DAYS) {
      cells[day.key as PortalDayKey] = p.isBreak ? null : byCell.get(`${day.key}:${p.id}`) ?? null;
    }
    return { periodId: p.id, label: p.label, start: p.startTime, end: p.endTime, isBreak: p.isBreak, cells };
  });

  const overview: PortalOverview = {
    studentName,
    classroomCode: placement.classroomCode,
    gradeLevel: placement.gradeLevel,
    termLabel: placement.termName,
    days: DAYS,
    periods,
    hasSchedule: slots.length > 0,
  };
  return { ...selection, overview, entry };
}
