import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { syncLateBehaviorPoints, refundApprovedLatePoints } from "@/features/behavior/services/late-points";

const mocks = { $executeRaw: vi.fn(), behaviorPointEntry: { findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() }, leaveRequest: { findFirst: vi.fn() }, auditLog: { create: vi.fn() } };
const tx = mocks as unknown as Prisma.TransactionClient;
const day = new Date("2026-11-16T00:00:00Z");
beforeEach(() => { vi.clearAllMocks(); mocks.$executeRaw.mockResolvedValue(1); mocks.behaviorPointEntry.findUnique.mockResolvedValue(null); mocks.leaveRequest.findFirst.mockResolvedValue(null); mocks.behaviorPointEntry.updateMany.mockResolvedValue({ count: 1 }); });
describe("automatic late points with approved permissions", () => {
  it("deducts ten for a late arrival without an approved permission", async () => {
    await syncLateBehaviorPoints(tx, "term", "child", day, true);
    expect(mocks.behaviorPointEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ delta: -10, source: "LATE_ENTRY" }) }));
  });
  it("does not create any penalty or bonus when approval precedes arrival", async () => {
    mocks.leaveRequest.findFirst.mockResolvedValue({ id: "approved" });
    await syncLateBehaviorPoints(tx, "term", "child", day, true);
    expect(mocks.behaviorPointEntry.upsert).not.toHaveBeenCalled();
    expect(mocks.leaveRequest.findFirst).toHaveBeenCalledWith({ where: { termId: "term", studentId: "child", kind: "LATE", status: "APPROVED", startDate: day, endDate: day }, select: { id: true } });
  });
  it("restores an existing automatic penalty to zero without creating positive points", async () => {
    mocks.behaviorPointEntry.findUnique.mockResolvedValue({ delta: -10 });
    mocks.leaveRequest.findFirst.mockResolvedValue({ id: "approved" });
    await syncLateBehaviorPoints(tx, "term", "child", day, true);
    expect(mocks.behaviorPointEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ delta: 0 }) }));
    expect(mocks.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "behavior.late.exempt" }) }));
  });
  it("is idempotent when an exempt arrival is processed again", async () => {
    mocks.behaviorPointEntry.findUnique.mockResolvedValue({ delta: 0 });
    mocks.leaveRequest.findFirst.mockResolvedValue({ id: "approved" });
    await syncLateBehaviorPoints(tx, "term", "child", day, true);
    expect(mocks.behaviorPointEntry.upsert).not.toHaveBeenCalled();
  });
  it("keeps on-time correction behavior without consulting late permissions", async () => {
    mocks.behaviorPointEntry.findUnique.mockResolvedValue({ delta: -10 });
    await syncLateBehaviorPoints(tx, "term", "child", day, false);
    expect(mocks.leaveRequest.findFirst).not.toHaveBeenCalled();
    expect(mocks.behaviorPointEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ delta: 0 }) }));
  });
  it("refunds only the automatic adjustment for the exact child, term, and day", async () => {
    await refundApprovedLatePoints(tx, "term", "child", day, "teacher");
    expect(mocks.behaviorPointEntry.updateMany).toHaveBeenCalledWith({ where: { sourceKey: "late:term:child:2026-11-16", source: "LATE_ENTRY", delta: { lt: 0 } }, data: { delta: 0, note: expect.any(String), actorUserId: "teacher" } });
    expect(mocks.$executeRaw).toHaveBeenCalled();
    expect(mocks.behaviorPointEntry.upsert).not.toHaveBeenCalled();
  });
});
