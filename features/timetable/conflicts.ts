import type { ConflictResult, DayKey, ExternalBusy, Offering, PlacedSlot } from "./types";

interface CheckArgs {
  offering: Offering;
  day: DayKey;
  periodId: string;
  slots: PlacedSlot[];
  offeringsById: Map<string, Offering>;
  externalBusy: ExternalBusy[];
  /** When moving an existing slot, exclude it from conflict checks. */
  ignoreSlotId?: string;
}

/**
 * Decide whether `offering` may be placed at (day, period). A teacher, a room, or
 * this class may not be double-booked in the same period. Pure and synchronous so
 * it can drive both drop validation and live drag highlighting.
 */
export function checkConflict({
  offering,
  day,
  periodId,
  slots,
  offeringsById,
  externalBusy,
  ignoreSlotId,
}: CheckArgs): ConflictResult {
  const cellSlots = slots.filter(
    (s) => s.day === day && s.periodId === periodId && s.id !== ignoreSlotId,
  );

  // This class already has a lesson in this period. In teacher view, other
  // classes' lessons remain visible but do not count as a class conflict.
  if (cellSlots.some((slot) => offeringsById.get(slot.offeringId)?.classroomId === offering.classroomId)) {
    return { ok: false, kind: "class", reason: "ชั้นเรียนนี้มีคาบเรียนแล้วในช่องนี้" };
  }

  const busy = externalBusy.find((b) => b.day === day && b.periodId === periodId);

  if (busy?.classroomIds?.includes(offering.classroomId ?? "")) {
    return { ok: false, kind: "class", reason: "ชั้นเรียนนี้มีคาบเรียนแล้วในช่องนี้" };
  }

  // Teacher busy — from this class's other slots or from another class.
  const teacherBusyHere = slots.some(
    (s) =>
      s.day === day &&
      s.periodId === periodId &&
      s.id !== ignoreSlotId &&
      offeringsById.get(s.offeringId)?.teacherId === offering.teacherId,
  );
  if (teacherBusyHere || busy?.teacherIds.includes(offering.teacherId)) {
    return { ok: false, kind: "teacher", reason: `${offering.teacherName} ติดสอนในคาบนี้` };
  }

  // Room busy — from this class's other slots or from another class.
  const roomBusyHere = slots.some(
    (s) =>
      s.day === day &&
      s.periodId === periodId &&
      s.id !== ignoreSlotId &&
      offeringsById.get(s.offeringId)?.roomId === offering.roomId,
  );
  if (roomBusyHere || busy?.roomIds.includes(offering.roomId)) {
    return { ok: false, kind: "room", reason: `${offering.roomName} ไม่ว่างในคาบนี้` };
  }

  return { ok: true };
}
