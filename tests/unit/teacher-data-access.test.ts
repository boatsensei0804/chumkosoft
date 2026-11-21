import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/dal";

const mocks = vi.hoisted(() => ({ enrollment: vi.fn(), advisors: vi.fn(), guardian: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: {
  enrollment: { findFirst: mocks.enrollment },
  classroomAdvisor: { findMany: mocks.advisors },
  guardian: { findFirst: mocks.guardian },
} }));

import { advisedStudentClassroomId, advisoryClassroomIds, canEditAdvisedGuardian } from "@/lib/teacher-data-access";

const teacher: CurrentUser = {
  id: "user-1", email: "teacher@example.com", role: "TEACHER", staffId: "staff-1",
  displayName: "ครูทดสอบ", firstName: "ครู", subtitle: "ครู", initials: "คท",
};

beforeEach(() => vi.resetAllMocks());

describe("teacher advisory data scope", () => {
  it("limits editable students to the teacher's room in the active term", async () => {
    mocks.enrollment.mockResolvedValue({ classroomId: "room-1" });
    expect(await advisedStudentClassroomId(teacher, "student-1")).toBe("room-1");
    expect(mocks.enrollment.mock.calls[0][0].where).toMatchObject({
      studentId: "student-1", isDeleted: false,
      term: { isActive: true, academicYear: { isActive: true } },
      classroom: { advisors: { some: { staffId: "staff-1" } } },
    });
    mocks.enrollment.mockResolvedValue(null);
    expect(await advisedStudentClassroomId(teacher, "other-student")).toBeNull();
  });

  it("denies teachers without a linked staff record", async () => {
    expect(await advisedStudentClassroomId({ ...teacher, staffId: null }, "student-1")).toBeNull();
    expect(await advisoryClassroomIds({ ...teacher, staffId: null })).toEqual([]);
    expect(mocks.enrollment).not.toHaveBeenCalled();
  });

  it("allows a guardian only when their student is in an advisory room", async () => {
    mocks.guardian.mockResolvedValue({ studentId: "student-1" });
    mocks.enrollment.mockResolvedValue({ classroomId: "room-1" });
    expect(await canEditAdvisedGuardian(teacher, "guardian-1")).toBe(true);
    mocks.enrollment.mockResolvedValue(null);
    expect(await canEditAdvisedGuardian(teacher, "guardian-1")).toBe(false);
  });
});
