import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  listPortalStudents: vi.fn(),
  findActivePlacement: vi.fn(),
  findWeeklySlots: vi.fn(),
  findPortalEntries: vi.fn(),
}));

vi.mock("@/features/portal/repositories/portal-repository", () => repository);
vi.mock("@/repositories/timetable-repository", () => ({ getPeriods: () => Promise.resolve([]) }));

import { getPortalOverview } from "@/features/portal/services/portal-service";

describe("portal student selection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repository.listPortalStudents.mockResolvedValue([
      { id: "child-a", prefix: null, firstName: "นักเรียน", lastName: "หนึ่ง" },
      { id: "child-b", prefix: null, firstName: "นักเรียน", lastName: "สอง" },
    ]);
    repository.findActivePlacement.mockResolvedValue({
      termId: "term", termName: "ภาคเรียนปัจจุบัน", classroomId: "class-b", classroomCode: "ม.2/2", gradeLevel: "ม.2",
    });
    repository.findWeeklySlots.mockResolvedValue([]);
    repository.findPortalEntries.mockResolvedValue({ checkInAt: new Date("2026-11-22T00:20:00Z") });
  });

  it("loads the selected child's room and attendance rather than the first child's", async () => {
    const result = await getPortalOverview("parent", "PARENT", "2026-11-22", "child-b");
    expect(result.options.map((option) => option.id)).toEqual(["child-a", "child-b"]);
    expect(result.selectedId).toBe("child-b");
    expect(result.overview.classroomCode).toBe("ม.2/2");
    expect(repository.findActivePlacement).toHaveBeenCalledWith("child-b");
    expect(repository.findPortalEntries).toHaveBeenCalledWith("term", "child-b", new Date("2026-11-22T00:00:00Z"));
  });

  it("does not look up data for an unrelated student selected through the URL", async () => {
    const result = await getPortalOverview("parent", "PARENT", "2026-11-22", "another-student");
    expect(result.unavailable).toBe(true);
    expect(result.overview.studentName).toBeNull();
    expect(repository.findActivePlacement).not.toHaveBeenCalled();
    expect(repository.findPortalEntries).not.toHaveBeenCalled();
  });
});
