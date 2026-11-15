import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/dal";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), student: vi.fn(), transaction: vi.fn(), push: vi.fn(), logAudit: vi.fn(), tx: { $executeRaw: vi.fn(), leaveRequest: { updateMany: vi.fn() }, behaviorPointEntry: { updateMany: vi.fn() }, schoolEntry: { findMany: vi.fn() }, dailyAttendance: { findMany: vi.fn(), upsert: vi.fn() }, auditLog: { create: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({ default: { leaveRequest: { findUnique: mocks.findUnique }, student: { findUnique: mocks.student }, $transaction: mocks.transaction } }));
vi.mock("@/lib/line", () => ({ pushLineMessage: mocks.push }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));
vi.mock("@/features/leave/services/line-leave-service", () => ({ notifyAdvisorsOfLeaveRequest: vi.fn() }));
import { reviewLeaveRequest } from "@/features/leave/services/leave-review-service";
const teacher = { id: "teacherUser", role: "TEACHER", staffId: "teacherStaff" } as CurrentUser;
function request() { return { id: "request", termId: "term", studentId: "child2", startDate: new Date("2026-11-16"), endDate: new Date("2026-11-16"), status: "PENDING", kind: "LATE", expectedArrivalTime: "09:30", reason: "Traffic", classroomId: "room", parentLineUserId: "parent", classroom: { advisors: [{ staffId: "teacherStaff" }] } }; }
beforeEach(() => {
  vi.clearAllMocks(); mocks.findUnique.mockResolvedValue(request()); mocks.student.mockResolvedValue({ firstName: "ChildTwo", lastName: "Family" }); mocks.transaction.mockImplementation((work) => work(mocks.tx));
  mocks.tx.$executeRaw.mockResolvedValue(1); mocks.tx.leaveRequest.updateMany.mockResolvedValue({ count: 1 }); mocks.tx.behaviorPointEntry.updateMany.mockResolvedValue({ count: 1 }); mocks.tx.schoolEntry.findMany.mockResolvedValue([]); mocks.tx.dailyAttendance.findMany.mockResolvedValue([]); mocks.push.mockResolvedValue(true);
});
describe("late request approval", () => {
  it("approves even after a scan, refunds points, and never rewrites attendance or real arrival", async () => {
    mocks.tx.schoolEntry.findMany.mockResolvedValue([{ date: new Date("2026-11-16") }]);
    expect((await reviewLeaveRequest("request", "APPROVED", "", teacher)).ok).toBe(true);
    expect(mocks.tx.schoolEntry.findMany).not.toHaveBeenCalled();
    expect(mocks.tx.dailyAttendance.upsert).not.toHaveBeenCalled();
    expect(mocks.tx.behaviorPointEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ sourceKey: "late:term:child2:2026-11-16" }), data: expect.objectContaining({ delta: 0 }) }));
    expect(mocks.tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(mocks.tx.leaveRequest.updateMany.mock.invocationCallOrder[0]);
    expect(JSON.stringify(mocks.push.mock.calls)).toContain("09:30");
  });
  it("does not grant an exemption or refund for rejection", async () => {
    expect((await reviewLeaveRequest("request", "REJECTED", "Not approved", teacher)).ok).toBe(true);
    expect(mocks.tx.behaviorPointEntry.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.dailyAttendance.upsert).not.toHaveBeenCalled();
  });
  it("rejects teachers outside the student's advisory classroom", async () => {
    expect((await reviewLeaveRequest("request", "APPROVED", "", { ...teacher, staffId: "other" })).ok).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("cannot refund twice when another reviewer already processed the request", async () => {
    mocks.tx.leaveRequest.updateMany.mockResolvedValue({ count: 0 });
    expect((await reviewLeaveRequest("request", "APPROVED", "", teacher)).ok).toBe(false);
    expect(mocks.tx.behaviorPointEntry.updateMany).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("preserves sick-leave attendance recording", async () => {
    mocks.findUnique.mockResolvedValue({ ...request(), kind: "SICK", expectedArrivalTime: null });
    expect((await reviewLeaveRequest("request", "APPROVED", "", teacher)).ok).toBe(true);
    expect(mocks.tx.dailyAttendance.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: "SICK_LEAVE" }) }));
    expect(mocks.tx.behaviorPointEntry.updateMany).not.toHaveBeenCalled();
  });
});
