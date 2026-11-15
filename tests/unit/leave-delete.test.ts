import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/dal";
const m = vi.hoisted(() => ({ update: vi.fn(), audit: vi.fn(), transaction: vi.fn(), find: vi.fn(), push: vi.fn(), auth: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { $transaction: m.transaction, leaveRequest: { findUnique: m.find } } }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/line", () => ({ pushLineMessage: m.push }));
vi.mock("@/features/leave/services/line-leave-service", () => ({ notifyAdvisorsOfLeaveRequest: vi.fn() }));
vi.mock("@/features/behavior/services/late-points", () => ({ lockLateBehaviorDay: vi.fn(), refundApprovedLatePoints: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireRoles: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
import { deleteLeaveRequest, reviewLeaveRequest } from "@/features/leave/services/leave-review-service";
import { deleteLeaveRequestAction } from "@/features/leave/actions";
const admin = { id: "admin", role: "ADMIN" } as CurrentUser;
beforeEach(() => {
  vi.resetAllMocks();
  m.transaction.mockImplementation(async fn => fn({ leaveRequest: { updateMany: m.update }, auditLog: { create: m.audit } }));
  m.update.mockResolvedValue({ count: 1 }); m.audit.mockResolvedValue({});
});
describe("leave request deletion", () => {
  it("rejects non-admins before mutation", async () => {
    expect((await deleteLeaveRequest("request", { role: "TEACHER" } as CurrentUser)).ok).toBe(false);
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it("soft-deletes with actor and audit atomically, preserving attendance and points without sending LINE", async () => {
    expect((await deleteLeaveRequest("request", admin)).ok).toBe(true);
    expect(m.update).toHaveBeenCalledWith({ where: { id: "request", isDeleted: false }, data: { isDeleted: true, deletedAt: expect.any(Date), deletedByUserId: "admin" } });
    expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: "admin", action: "leave.request.delete", targetId: "request" }) });
    expect(m.push).not.toHaveBeenCalled();
  });
  it("does not audit another deletion if the request is already gone", async () => {
    m.update.mockResolvedValue({ count: 0 });
    expect((await deleteLeaveRequest("request", admin)).ok).toBe(false); expect(m.audit).not.toHaveBeenCalled();
  });
  it("does not approve or reject a deleted request", async () => {
    m.find.mockResolvedValue({ isDeleted: true });
    expect((await reviewLeaveRequest("request", "APPROVED", "", admin)).ok).toBe(false);
    expect(m.transaction).not.toHaveBeenCalled(); expect(m.push).not.toHaveBeenCalled();
  });
  it("requires admin authorization at the server action boundary", async () => {
    m.auth.mockRejectedValue(new Error("Forbidden"));
    await expect(deleteLeaveRequestAction("request")).rejects.toThrow("Forbidden");
    expect(m.auth).toHaveBeenCalledWith(["ADMIN"]); expect(m.transaction).not.toHaveBeenCalled();
  });
});
