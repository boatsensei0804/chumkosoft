import { describe, it, expect } from "vitest";
import { checkConflict } from "@/features/timetable/conflicts";
import type { Offering, PlacedSlot } from "@/features/timetable/types";

function offering(id: string, teacherId: string, roomId: string): Offering {
  return { id, courseCode: id, courseName: id, teacherId, teacherName: `T-${teacherId}`, roomId, roomName: `R-${roomId}`, color: "blue", periodsPerWeek: 2 };
}

const math = offering("math", "t1", "r1");
const sci = offering("sci", "t1", "r2"); // same teacher as math, different room
const art = offering("art", "t2", "r1"); // same room as math, different teacher
const offeringsById = new Map([math, sci, art].map((o) => [o.id, o]));

function base() {
  return { day: "MON" as const, periodId: "p1", slots: [] as PlacedSlot[], offeringsById, externalBusy: [] };
}

describe("checkConflict", () => {
  it("allows an empty cell", () => {
    expect(checkConflict({ offering: math, ...base() }).ok).toBe(true);
  });

  it("blocks when this class already has a lesson in the cell", () => {
    const slots: PlacedSlot[] = [{ id: "s1", offeringId: "art", day: "MON", periodId: "p1" }];
    const result = checkConflict({ offering: math, ...base(), slots });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe("class");
  });

  it("blocks a teacher double-booked by another class (external busy)", () => {
    const externalBusy = [{ day: "MON" as const, periodId: "p1", teacherIds: ["t1"], roomIds: [] }];
    const result = checkConflict({ offering: sci, ...base(), externalBusy });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe("teacher");
  });

  it("blocks a room double-booked by another class (external busy)", () => {
    const externalBusy = [{ day: "MON" as const, periodId: "p1", teacherIds: [], roomIds: ["r1"] }];
    const result = checkConflict({ offering: art, ...base(), externalBusy });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe("room");
  });

  it("ignores the slot being moved", () => {
    const slots: PlacedSlot[] = [{ id: "self", offeringId: "math", day: "MON", periodId: "p1" }];
    const result = checkConflict({ offering: math, ...base(), slots, ignoreSlotId: "self" });
    expect(result.ok).toBe(true);
  });
});
