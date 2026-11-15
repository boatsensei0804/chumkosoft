import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ term: vi.fn(), rooms: vi.fn(), enrollments: vi.fn(), names: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { term: { findFirst: mocks.term }, classroom: { findMany: mocks.rooms }, enrollment: { findMany: mocks.enrollments } } }));
vi.mock("@/features/line/services/line-profiles", () => ({ getLineDisplayNames: mocks.names }));
import { getLineLinkReport, InvalidReportClassroom } from "@/features/line/services/line-link-report-service";
beforeEach(() => { vi.resetAllMocks(); mocks.term.mockResolvedValue({ id: "term", name: "ภาคเรียนตัวอย่าง", academicYearId: "year" }); mocks.rooms.mockResolvedValue([{ id: "a", code: "ม.1/1" }, { id: "b", code: "ม.1/2" }]); mocks.names.mockResolvedValue(new Map()); });
describe("binding report data scope", () => {
  it("uses current term only and returns no students without an active term", async () => {
    mocks.term.mockResolvedValue(null);
    const result = await getLineLinkReport();
    expect(result.hasActiveTerm).toBe(false); expect(result.students).toEqual([]); expect(result.overall.percentage).toBeNull(); expect(mocks.enrollments).not.toHaveBeenCalled();
  });
  it("rejects classrooms outside the active academic year", async () => {
    await expect(getLineLinkReport("other-year")).rejects.toBeInstanceOf(InvalidReportClassroom);
    expect(mocks.enrollments).not.toHaveBeenCalled();
  });
  it("keeps school totals while returning names and codes only for the selected classroom", async () => {
    mocks.enrollments.mockResolvedValue(["a", "b"].map(id => ({ classroomId: id, classroom: { code: id }, student: { id, studentCode: id, prefix: null, firstName: "ตัวอย่าง", lastName: id, guardians: [], lineAccounts: [{ lineUserId: `U${id}`, lineLinkCode: null }] } })));
    const result = await getLineLinkReport("a");
    expect(result.overall.total).toBe(2); expect(result.students.map(student => student.id)).toEqual(["a"]);
    expect(mocks.names).toHaveBeenCalledWith(["Ua"], { lookupBudgetMs: 6000 });
    expect(mocks.enrollments).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ termId: "term", isDeleted: false, classroomId: { in: ["a", "b"] }, student: { isDeleted: false } }) }));
    expect(JSON.stringify(result)).not.toContain("Ua"); expect(JSON.stringify(result)).not.toContain("Ub");
  });
});
