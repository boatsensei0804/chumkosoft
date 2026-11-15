import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/dal";
const m = vi.hoisted(() => ({ term: vi.fn(), enrollments: vi.fn(), requests: vi.fn(), profiles: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { term: { findFirst: m.term }, enrollment: { findMany: m.enrollments }, leaveRequest: { findMany: m.requests } } }));
vi.mock("@/features/line/services/line-profiles", () => ({ getLineDisplayNames: m.profiles }));
import { getLeaveDailyReport } from "@/features/leave/services/leave-daily-report-service";
const admin = { id: "admin", role: "ADMIN", staffId: null } as CurrentUser;
const teacher = { id: "teacher", role: "TEACHER", staffId: "staff" } as CurrentUser;
beforeEach(() => {
  vi.resetAllMocks();
  m.term.mockResolvedValue({ id: "term", name: "2/2569", academicYearId: "year" });
  m.enrollments.mockResolvedValue([{ studentId: "a" }, { studentId: "b" }, { studentId: "a" }]);
  m.requests.mockResolvedValue([]); m.profiles.mockResolvedValue(new Map());
});
describe("daily leave report data scope", () => {
  it("checks roles and dates before reading data", async () => {
    await expect(getLeaveDailyReport({ role: "STUDENT" } as CurrentUser, "2026-11-15")).rejects.toThrow("Forbidden");
    await expect(getLeaveDailyReport(admin, "2026-02-30")).rejects.toThrow("Invalid report date");
    expect(m.term).not.toHaveBeenCalled();
  });
  it("returns no data without an active term", async () => {
    m.term.mockResolvedValue(null);
    expect(await getLeaveDailyReport(admin, "2026-11-15")).toMatchObject({ term: null, totalStudents: 0, items: [] });
    expect(m.requests).not.toHaveBeenCalled();
  });
  it("includes multi-day requests on the chosen date, excludes deleted rows, and has no 100-record cap", async () => {
    const report = await getLeaveDailyReport(teacher, "2026-11-15");
    expect(report.totalStudents).toBe(2); expect(report.teacherScoped).toBe(true);
    const query = m.requests.mock.calls[0][0];
    expect(query.where).toMatchObject({ isDeleted: false, termId: "term", studentId: { in: ["a", "b"] }, startDate: { lte: new Date("2026-11-15T00:00:00Z") }, endDate: { gte: new Date("2026-11-15T00:00:00Z") }, classroom: { advisors: { some: { staffId: "staff" } } } });
    expect(query.take).toBeUndefined();
  });
  it("allows finding old test requests across the active term without changing the school denominator", async () => {
    const report = await getLeaveDailyReport(admin, "2026-11-15", true);
    const query = m.requests.mock.calls[0][0];
    expect(query.where.startDate).toBeUndefined(); expect(query.where.endDate).toBeUndefined();
    expect(query.where).toMatchObject({ termId: "term", isDeleted: false });
    expect(report).toMatchObject({ allDates: true, totalStudents: 2, date: "2026-11-15" });
  });
  it("identifies the submitting account rather than any other linked guardian, without exposing raw IDs", async () => {
    m.requests.mockResolvedValue([{ id: "request", studentId: "a", parentLineUserId: "Uactualsender", kind: "SICK", expectedArrivalTime: null, startDate: new Date("2026-11-14"), endDate: new Date("2026-11-16"), reason: "ป่วย", status: "PENDING", reviewNote: null, advisorNotifiedCount: 0, advisorLineTargets: [], createdAt: new Date("2026-11-13"), classroom: { code: "ม.1/1" }, student: { studentCode: "001", firstName: "สมมติ", lastName: "ทดสอบ", guardians: [{ fullName: "ผู้ส่ง", relation: "แม่", lineUserId: "Uactualsender" }, { fullName: "อีกคน", lineUserId: "Uother" }] } }]);
    m.profiles.mockResolvedValue(new Map([["Uactualsender", "ชื่อ LINE ผู้ส่ง"]]));
    const report = await getLeaveDailyReport(admin, "2026-11-15");
    expect(report.items[0].sender).toMatchObject({ displayName: "ชื่อ LINE ผู้ส่ง", guardianNames: ["ผู้ส่ง (แม่)"] });
    expect(report.items[0].sender.reference).toHaveLength(12);
    expect(JSON.stringify(report)).not.toContain("Uactualsender"); expect(JSON.stringify(report)).not.toContain("Uother");
  });
});
