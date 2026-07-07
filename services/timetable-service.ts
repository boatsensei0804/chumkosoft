import * as repo from "@/repositories/timetable-repository";
import type {
  ContextOption,
  DayInfo,
  DayKey,
  ExternalBusy,
  Offering,
  PeriodRow,
  PlacedSlot,
  SubjectColor,
} from "@/features/timetable/types";

const DAYS: DayInfo[] = [
  { key: "MON", label: "จันทร์", short: "จ." },
  { key: "TUE", label: "อังคาร", short: "อ." },
  { key: "WED", label: "พุธ", short: "พ." },
  { key: "THU", label: "พฤหัสบดี", short: "พฤ." },
  { key: "FRI", label: "ศุกร์", short: "ศ." },
];

const COLORS: SubjectColor[] = ["blue", "teal", "green", "amber", "purple", "rose", "cyan", "indigo"];

function formatTeacher(t: { prefix: string | null; firstName: string; lastName: string }): string {
  return [t.prefix, `${t.firstName} ${t.lastName}`].filter(Boolean).join(" ");
}

function formatRoom(r: { code: string; name: string | null; building: string | null }): string {
  if (r.name) return r.name;
  return r.building ? `${r.building} · ${r.code}` : r.code;
}

export interface TimetableBoard {
  context: { termId: string; termName: string; classroomId: string; classroomCode: string } | null;
  terms: ContextOption[];
  classrooms: ContextOption[];
  days: DayInfo[];
  periods: PeriodRow[];
  offerings: Offering[];
  slots: PlacedSlot[];
  externalBusy: ExternalBusy[];
}

export interface MutationResult {
  ok: boolean;
  reason?: string;
  slot?: PlacedSlot;
}

export async function getTimetableBoard(opts?: { termId?: string; classroomId?: string }): Promise<TimetableBoard> {
  const ctx = await repo.resolveContext(opts);
  if (!ctx) {
    const terms = await repo.listTermOptions();
    return {
      context: null,
      terms: terms.map((t) => ({ id: t.id, label: t.name })),
      classrooms: [],
      days: DAYS,
      periods: [],
      offerings: [],
      slots: [],
      externalBusy: [],
    };
  }

  const [periodRows, offeringRows, slotRows, busyRows, termRows, classroomRows] = await Promise.all([
    repo.getPeriods(),
    repo.getOfferings(ctx.termId, ctx.classroomId),
    repo.getClassSlots(ctx.termId, ctx.classroomId),
    repo.getExternalBusy(ctx.termId, ctx.classroomId),
    repo.listTermOptions(),
    repo.listClassroomOptions(ctx.academicYearId),
  ]);

  const periods: PeriodRow[] = periodRows.map((p) => ({
    id: p.id,
    index: p.index,
    label: p.label,
    start: p.startTime,
    end: p.endTime,
    kind: p.isBreak ? "break" : "class",
  }));

  const offerings: Offering[] = offeringRows.map((o, i) => ({
    id: o.id,
    courseCode: o.course.code,
    courseName: o.course.name,
    teacherId: o.teacherId,
    teacherName: formatTeacher(o.teacher),
    roomId: o.roomId,
    roomName: formatRoom(o.room),
    color: COLORS[i % COLORS.length],
    periodsPerWeek: o.periodsPerWeek,
  }));

  const slots: PlacedSlot[] = slotRows.map((s) => ({
    id: s.id,
    offeringId: s.courseOfferingId,
    day: s.dayOfWeek as DayKey,
    periodId: s.periodId,
  }));

  const busyMap = new Map<string, ExternalBusy>();
  for (const b of busyRows) {
    const key = `${b.dayOfWeek}:${b.periodId}`;
    let e = busyMap.get(key);
    if (!e) {
      e = { day: b.dayOfWeek as DayKey, periodId: b.periodId, teacherIds: [], roomIds: [] };
      busyMap.set(key, e);
    }
    if (!e.teacherIds.includes(b.teacherId)) e.teacherIds.push(b.teacherId);
    if (!e.roomIds.includes(b.roomId)) e.roomIds.push(b.roomId);
  }

  return {
    context: {
      termId: ctx.termId,
      termName: ctx.termName,
      classroomId: ctx.classroomId,
      classroomCode: ctx.classroomCode,
    },
    terms: termRows.map((t) => ({ id: t.id, label: t.name })),
    classrooms: classroomRows.map((c) => ({ id: c.id, label: c.code })),
    days: DAYS,
    periods,
    offerings,
    slots,
    externalBusy: [...busyMap.values()],
  };
}

function conflictReason(
  conflicts: { classroomId: string; teacherId: string; roomId: string }[],
  self: { classroomId: string; teacherId: string; roomId: string; teacherName: string; roomName: string },
): string | null {
  if (conflicts.some((c) => c.classroomId === self.classroomId)) return "ชั้นเรียนนี้มีคาบเรียนแล้วในช่องนี้";
  if (conflicts.some((c) => c.teacherId === self.teacherId)) return `${self.teacherName} ติดสอนในคาบนี้`;
  if (conflicts.some((c) => c.roomId === self.roomId)) return `${self.roomName} ไม่ว่างในคาบนี้`;
  return null;
}

export async function placeOffering(offeringId: string, day: DayKey, periodId: string): Promise<MutationResult> {
  const off = await repo.getOfferingForPlacement(offeringId);
  if (!off) return { ok: false, reason: "ไม่พบรายวิชา" };

  const remaining = off.periodsPerWeek - off._count.timetableSlots;
  if (remaining <= 0) return { ok: false, reason: `${off.course.name} จัดครบตามจำนวนคาบแล้ว` };

  const conflicts = await repo.findCellConflicts({
    termId: off.termId,
    classroomId: off.classroomId,
    teacherId: off.teacherId,
    roomId: off.roomId,
    dayOfWeek: day,
    periodId,
  });
  const reason = conflictReason(conflicts, {
    classroomId: off.classroomId,
    teacherId: off.teacherId,
    roomId: off.roomId,
    teacherName: formatTeacher(off.teacher),
    roomName: formatRoom(off.room),
  });
  if (reason) return { ok: false, reason };

  const created = await repo.createSlot({
    termId: off.termId,
    courseOfferingId: off.id,
    teacherId: off.teacherId,
    classroomId: off.classroomId,
    roomId: off.roomId,
    periodId,
    dayOfWeek: day,
  });
  return { ok: true, slot: { id: created.id, offeringId: off.id, day, periodId } };
}

export async function moveSlot(slotId: string, day: DayKey, periodId: string): Promise<MutationResult> {
  const slot = await repo.getSlotWithOffering(slotId);
  if (!slot) return { ok: false, reason: "ไม่พบคาบเรียน" };

  const conflicts = await repo.findCellConflicts({
    termId: slot.termId,
    classroomId: slot.classroomId,
    teacherId: slot.teacherId,
    roomId: slot.roomId,
    dayOfWeek: day,
    periodId,
    excludeSlotId: slotId,
  });
  const reason = conflictReason(conflicts, {
    classroomId: slot.classroomId,
    teacherId: slot.teacherId,
    roomId: slot.roomId,
    teacherName: formatTeacher(slot.teacher),
    roomName: formatRoom(slot.room),
  });
  if (reason) return { ok: false, reason };

  await repo.updateSlotCell(slotId, day, periodId);
  return { ok: true, slot: { id: slotId, offeringId: slot.courseOfferingId, day, periodId } };
}

export async function removeSlot(slotId: string): Promise<MutationResult> {
  await repo.softDeleteSlot(slotId);
  return { ok: true };
}
