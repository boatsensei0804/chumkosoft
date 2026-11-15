import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ snapshot: vi.fn(), page: vi.fn() }));
vi.mock("@/repositories/student-repository", () => ({ findStudentWorkspaceSnapshot: m.snapshot, findStudentWorkspacePage: m.page }));
import { getStudentsWorkspace } from "@/services/student-service";
beforeEach(() => { vi.resetAllMocks(); m.page.mockResolvedValue([]); });
describe("student workspace pagination", () => {
  it("uses the same current-term IDs for combined filters and clamps out-of-range pages", async () => {
    m.snapshot.mockResolvedValue({ term: { id: "term", name: "2/2569" }, classrooms: [{ id: "room", code: "1/1", gradeLevel: "ต้น" }], students: [{ id: "a", studentCode: "001", firstName: "สมมติ", lastName: "ทดสอบ", gender: "หญิง", enrollments: [{ classroomId: "room", status: "ACTIVE" }] }, { id: "b", studentCode: "002", firstName: "ยังไม่จัด", lastName: "ห้อง", gender: "ชาย", enrollments: [] }] });
    const result = await getStudentsWorkspace({ page: 99, search: "", filter: "all", classroom: "room", gender: "female", grade: "" });
    expect(m.page).toHaveBeenCalledWith({ ids: ["a"], termId: "term", skip: 0, take: 20 });
    expect(result.page).toMatchObject({ total: 1, page: 1 }); expect(result.overview.overall).toMatchObject({ total: 2, unassigned: 1 });
  });
  it("keeps unplaced students visible without using historical enrollment when no term is active", async () => {
    m.snapshot.mockResolvedValue({ term: null, classrooms: [], students: [{ id: "a", studentCode: "001", firstName: "สมมติ", lastName: "ทดสอบ", gender: null, enrollments: [] }] });
    const result = await getStudentsWorkspace({ page: 1, search: "", filter: "all", classroom: "unassigned", gender: "all", grade: "" });
    expect(result.overview).toMatchObject({ term: null, overall: { total: 1, active: 0, unassigned: 1 } });
    expect(m.page).toHaveBeenCalledWith({ ids: ["a"], termId: null, skip: 0, take: 20 });
  });
});
