import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  getActiveTerm: vi.fn(), findClassrooms: vi.fn(), findRecords: vi.fn(),
  findEnrolledStudents: vi.fn(), findGateEntries: vi.fn(),
}));
vi.mock("@/features/attendance/repositories/daily-roll-call-repository", () => repo);
vi.mock("@/lib/prisma", () => ({ default: {} }));
import { getDailyRollCallOverview } from "@/features/attendance/services/daily-roll-call-service";

beforeEach(() => {
  vi.clearAllMocks();
  repo.getActiveTerm.mockResolvedValue({ id: "term", academicYearId: "year" });
  repo.findClassrooms.mockResolvedValue([{ id: "room", code: "1/1", gradeLevel: "ป.1" }]);
  repo.findEnrolledStudents.mockResolvedValue([{ id: "on-time" }, { id: "late" }, { id: "leave" }]);
  repo.findRecords.mockResolvedValue([{ classroomId: "room", studentId: "leave", status: "SICK_LEAVE" }]);
  repo.findGateEntries.mockResolvedValue([
    { studentId: "on-time", isLate: false },
    { studentId: "late", isLate: true },
    { studentId: "leave", isLate: false },
    { studentId: "other-room", isLate: false },
  ]);
});

describe("daily school overview", () => {
  it("includes scanner arrivals without counting a teacher's saved status twice", async () => {
    const rooms = await getDailyRollCallOverview("2026-11-20");
    expect(rooms).toMatchObject([{ total: 3, present: 1, late: 1, sickLeave: 1, unchecked: 0 }]);
  });

  it("respects the advisor classroom scope", async () => {
    await getDailyRollCallOverview("2026-11-20", "advisor");
    expect(repo.findClassrooms).toHaveBeenCalledWith("term", "year", "advisor");
  });
});
