import {
  getDashboardCounts,
  getActiveAcademicContext,
  listAnnouncementRows,
  findEnrolmentDatesSince,
} from "@/repositories/dashboard-repository";
import { findSlotsForDay } from "@/repositories/timetable-repository";
import { formatThaiDate } from "@/utils/thai-date";
import type { Announcement, AnnouncementKind, EnrolmentPoint, Figure, ScheduleItem } from "@/features/dashboard/types";
import type { DayOfWeek } from "@prisma/client";

const ANNOUNCEMENT_KINDS: AnnouncementKind[] = ["info", "warning", "success"];

/** Latest dashboard announcements (real data). */
export async function listAnnouncements(limit = 5): Promise<Announcement[]> {
  const rows = await listAnnouncementRows(limit);
  return rows.map((a) => ({
    id: a.id,
    kind: ANNOUNCEMENT_KINDS.includes(a.kind as AnnouncementKind) ? (a.kind as AnnouncementKind) : "info",
    title: a.title,
    body: a.body,
    postedBy: a.postedBy,
    postedAt: formatThaiDate(a.createdAt),
  }));
}

/** New enrolments per month over the last 6 months, for the trend chart. */
export async function getEnrolmentTrend(): Promise<EnrolmentPoint[]> {
  const now = new Date();
  const monthKeys: { key: string; label: string; value: number }[] = [];
  const monthFmt = new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "Asia/Bangkok" });

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthFmt.format(d), value: 0 });
  }

  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const dates = await findEnrolmentDatesSince(since);
  const byKey = new Map(monthKeys.map((m) => [m.key, m]));
  for (const date of dates) {
    const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.value += 1;
  }

  return monthKeys.map((m) => ({ month: m.label, value: m.value }));
}

const WEEKDAY_ENUM: Record<string, DayOfWeek | undefined> = {
  Mon: "MON",
  Tue: "TUE",
  Wed: "WED",
  Thu: "THU",
  Fri: "FRI",
};

function bangkok(opts: Intl.DateTimeFormatOptions, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Bangkok", ...opts }).format(new Date());
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatTeacher(t: { prefix: string | null; firstName: string; lastName: string }): string {
  return [t.prefix, `${t.firstName} ${t.lastName}`].filter(Boolean).join(" ");
}

function formatRoom(r: { code: string; name: string | null; building: string | null }): string {
  if (r.name) return r.name;
  return r.building ? `${r.building} · ${r.code}` : r.code;
}

export interface TodaySchedule {
  isSchoolDay: boolean;
  weekdayLabel: string;
  classroomCode: string | null;
  items: ScheduleItem[];
}

/** Human label for the active academic year + term, e.g. "ปีการศึกษา 2568 · ภาคเรียนที่ 1". */
export async function getActiveTermLabel(): Promise<string> {
  const ctx = await getActiveAcademicContext();
  if (ctx.buddhistYear === null || ctx.termNumber === null) {
    return "ยังไม่ได้ตั้งค่าปีการศึกษา";
  }
  return `ปีการศึกษา ${ctx.buddhistYear} · ภาคเรียนที่ ${ctx.termNumber}`;
}

export async function getTodaySchedule(): Promise<TodaySchedule> {
  const weekdayLabel = bangkok({ weekday: "long" }, "th-TH");
  const day = WEEKDAY_ENUM[bangkok({ weekday: "short" })];
  if (!day) return { isSchoolDay: false, weekdayLabel, classroomCode: null, items: [] };

  const { classroomCode, slots } = await findSlotsForDay(day);
  const nowMin = toMinutes(bangkok({ hour: "2-digit", minute: "2-digit", hour12: false }, "en-GB"));

  const items: ScheduleItem[] = slots.map((s) => ({
    id: s.id,
    start: s.period.startTime,
    end: s.period.endTime,
    subject: s.courseOffering.course.name,
    classroom: classroomCode ?? "",
    teacher: formatTeacher(s.courseOffering.teacher),
    room: formatRoom(s.courseOffering.room),
    now: toMinutes(s.period.startTime) <= nowMin && nowMin < toMinutes(s.period.endTime),
  }));

  return { isSchoolDay: true, weekdayLabel, classroomCode, items };
}

/** Overview headline figures, computed from live data. deltaPct is 0 until there is
 *  historical data to compare against (the UI hides the trend chip when it is 0). */
export async function getSummaryFigures(): Promise<Figure[]> {
  const c = await getDashboardCounts();
  const term = c.termName ?? "ภาคเรียนปัจจุบัน";

  return [
    { key: "students", label: "นักเรียนทั้งหมด", value: c.students, unit: "คน", deltaPct: 0, caption: term },
    { key: "teachers", label: "ครูและบุคลากร", value: c.teachers, unit: "คน", deltaPct: 0, caption: "ประจำการปีนี้" },
    { key: "courses", label: "รายวิชาที่เปิดสอน", value: c.offerings, unit: "วิชา", deltaPct: 0, caption: term },
    { key: "pending", label: "รออนุมัติการลงทะเบียน", value: c.pendingEnrollments, unit: "รายการ", deltaPct: 0, caption: "ค้างดำเนินการ" },
  ];
}
