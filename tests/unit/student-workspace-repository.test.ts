import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ term: vi.fn(), students: vi.fn(), rooms: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { term: { findFirst: m.term }, student: { findMany: m.students }, classroom: { findMany: m.rooms } } }));
import { findStudentWorkspaceSnapshot, findStudentWorkspacePage } from "@/repositories/student-repository";
beforeEach(() => { vi.resetAllMocks(); m.students.mockResolvedValue([]); m.rooms.mockResolvedValue([]); });
describe("student current-term registry queries", () => {
  it("includes the full nondeleted registry while restricting room statistics to the current term/year", async () => {
    m.term.mockResolvedValue({ id: "term", name: "2/2569", academicYearId: "year" });
    await findStudentWorkspaceSnapshot();
    expect(m.students.mock.calls[0][0].where).toEqual({ isDeleted: false });
    expect(m.students.mock.calls[0][0].select.enrollments.where).toEqual({ isDeleted: false, termId: { in: ["term"] }, classroom: { isDeleted: false, academicYearId: "year" } });
    expect(m.rooms.mock.calls[0][0].where).toEqual({ isDeleted: false, academicYearId: "year" });
    expect(m.students.mock.calls[0][0].select.nationalId).toBeUndefined();
  });
  it("never falls back to old enrollments when no term is active, including the editable page", async () => {
    m.term.mockResolvedValue(null);
    await findStudentWorkspaceSnapshot();
    expect(m.students.mock.calls[0][0].select.enrollments.where.termId).toEqual({ in: [] });
    expect(m.rooms).not.toHaveBeenCalled();
    await findStudentWorkspacePage({ ids: ["student"], termId: null, skip: 0, take: 20 });
    expect(m.students.mock.calls[1][0]).toMatchObject({ where: { id: { in: ["student"] }, isDeleted: false }, select: { enrollments: { where: { isDeleted: false, termId: { in: [] } } } }, take: 20 });
  });
});
