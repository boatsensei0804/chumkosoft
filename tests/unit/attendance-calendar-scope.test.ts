import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ getActiveTerm: vi.fn(), findClassrooms: vi.fn(), findEnrolledRoster: vi.fn(), findRecordsInRange: vi.fn(), findGateEntriesInRange: vi.fn() }));
vi.mock("@/features/attendance/repositories/daily-roll-call-repository", () => repo);
vi.mock("@/lib/prisma", () => ({ default: {} }));
import { getDailyRollCallCalendar } from "@/features/attendance/services/daily-roll-call-service";

beforeEach(() => {
  vi.clearAllMocks();
  repo.getActiveTerm.mockResolvedValue({ id: "term", academicYearId: "year" });
  repo.findClassrooms.mockResolvedValue([{ id: "room-a" }, { id: "room-b" }]);
  repo.findEnrolledRoster.mockResolvedValue([{ classroomId: "room-b", studentId: "child" }]);
  repo.findRecordsInRange.mockResolvedValue([{ classroomId: "room-b", studentId: "child", date: new Date("2026-11-16T00:00:00Z"), status: "LATE" }]);
  repo.findGateEntriesInRange.mockResolvedValue([]);
});

describe("selected classroom calendar", () => {
  it("counts the selected room while keeping the advisor scope", async () => {
    const days = await getDailyRollCallCalendar("2026-11", "advisor", "room-b");
    expect(repo.findClassrooms).toHaveBeenCalledWith("term", "year", "advisor");
    expect(repo.findEnrolledRoster).toHaveBeenCalledWith("term", ["room-b"]);
    expect(repo.findRecordsInRange).toHaveBeenCalledWith("term", expect.any(Date), expect.any(Date), ["room-b"]);
    expect(days?.find(day => day.date === "2026-11-16")).toMatchObject({ total: 1, checked: 1, unchecked: 0, late: 1 });
  });
  it("does not query a room outside the advisor's authorized rooms", async () => {
    expect(await getDailyRollCallCalendar("2026-11", "advisor", "other-room")).toEqual([]);
    expect(repo.findEnrolledRoster).not.toHaveBeenCalled();
    expect(repo.findRecordsInRange).not.toHaveBeenCalled();
  });
  it("counts a scanner arrival when no homeroom record exists", async () => {
    repo.findRecordsInRange.mockResolvedValue([]);
    repo.findGateEntriesInRange.mockResolvedValue([{ studentId: "child", date: new Date("2026-11-16T00:00:00Z"), isLate: true }]);
    const days = await getDailyRollCallCalendar("2026-11", "advisor", "room-b");
    expect(days?.find(day => day.date === "2026-11-16")).toMatchObject({ total: 1, checked: 1, unchecked: 0, late: 1 });
  });
  it("keeps the teacher's saved status when a scanner arrival also exists", async () => {
    repo.findRecordsInRange.mockResolvedValue([{ classroomId: "room-b", studentId: "child", date: new Date("2026-11-16T00:00:00Z"), status: "SICK_LEAVE" }]);
    repo.findGateEntriesInRange.mockResolvedValue([{ studentId: "child", date: new Date("2026-11-16T00:00:00Z"), isLate: true }]);
    const days = await getDailyRollCallCalendar("2026-11", "advisor", "room-b");
    expect(days?.find(day => day.date === "2026-11-16")).toMatchObject({ total: 1, checked: 1, unchecked: 0, late: 0 });
  });
  it("uses a scanner arrival when a stale homeroom record belongs to another room", async () => {
    repo.findRecordsInRange.mockResolvedValue([{ classroomId: "room-a", studentId: "child", date: new Date("2026-11-16T00:00:00Z"), status: "ABSENT" }]);
    repo.findGateEntriesInRange.mockResolvedValue([{ studentId: "child", date: new Date("2026-11-16T00:00:00Z"), isLate: false }]);
    const days = await getDailyRollCallCalendar("2026-11", "advisor", "room-b");
    expect(days?.find(day => day.date === "2026-11-16")).toMatchObject({ total: 1, checked: 1, unchecked: 0, late: 0 });
  });
});
