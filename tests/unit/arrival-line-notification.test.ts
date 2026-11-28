import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commitCheckIn } from "@/features/faces/services/scan-service";
import { processScannerBatch } from "@/features/faces/services/scanner-sync";

const mocks = vi.hoisted(() => ({
  after: vi.fn(), record: vi.fn(), audit: vi.fn(), findTargets: vi.fn(), send: vi.fn(), receipt: vi.fn(),
  findScannerEvent: vi.fn(), updateEntry: vi.fn(), recordScanOutcome: vi.fn(),
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/features/faces/repositories/scan-repository", () => ({
  getActiveTermId: async () => "term",
  getMatchedStudent: async () => ({
    prefix: null, firstName: "Test", lastName: "Student", enrollments: [{ classroom: { code: "M1/1" } }],
  }),
  recordFaceCheckIn: mocks.record,
}));
vi.mock("@/features/kiosk/repositories/kiosk-repository", () => ({
  getScanSetting: async () => ({ scanStartTime: "06:00", lateAfterTime: "08:00" }),
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.audit }));
vi.mock("@/lib/prisma", () => ({
  default: {
    scannerSyncEvent: { findUnique: mocks.findScannerEvent },
    student: {
      findFirst: async () => ({ id: "student", prefix: null, firstName: "Test", lastName: "Student", faceConsent: true }),
    },
    term: {
      findMany: async () => [{ id: "term", startDate: new Date("2026-11-01T00:00:00Z"), endDate: new Date("2026-11-30T00:00:00Z") }],
    },
    enrollment: { findFirst: async () => ({ id: "enrollment" }) },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run({
      scannerSyncEvent: { create: vi.fn(), update: mocks.recordScanOutcome },
      schoolEntry: {
        upsert: async () => ({ id: "entry", isDeleted: false, checkInAt: null }),
        updateMany: mocks.updateEntry,
      },
      auditLog: { create: mocks.audit },
    }),
    lineOutboundMessage: { create: mocks.receipt },
  },
}));
vi.mock("@/features/behavior/services/late-points", () => ({ syncLateBehaviorPoints: vi.fn() }));
vi.mock("@/lib/line", () => ({ sendLineTextToUsers: mocks.send }));
vi.mock("@/features/line/services/line-delivery-settings", () => ({ isLinePushEnabled: async () => true }));
vi.mock("@/features/line/repositories/line-repository", () => ({ findLineTargets: mocks.findTargets }));

const checkInAt = new Date("2026-11-27T01:08:00Z");
const scan = {
  eventId: "041cf569-9fba-463f-9768-8441267a5c7a",
  studentCode: "00001", localDate: "2026-11-27", capturedAt: checkInAt.toISOString(),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(checkInAt);
  mocks.findScannerEvent.mockResolvedValue(null);
  mocks.updateEntry.mockResolvedValue({ count: 1 });
  mocks.record.mockResolvedValue({ alreadyCheckedIn: false, at: checkInAt, isLate: true });
  mocks.findTargets.mockResolvedValue(["Uparent", "Uparent"]);
  mocks.send.mockResolvedValue({ accepted: true, code: "HTTP_200", requestId: "request", acceptedRequestId: null });
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("LINE arrival notices", () => {
  it("schedules one notice per linked LINE account after committing the first scan", async () => {
    expect(await commitCheckIn("student")).toMatchObject({ status: "matched", time: "08:08" });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.after).toHaveBeenCalledTimes(1);

    const [notify] = mocks.after.mock.calls[0] as [() => Promise<void>];
    await notify();
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith(["Uparent"], expect.stringContaining("08:08"), expect.any(String));
    expect(mocks.receipt).toHaveBeenCalledOnce();
  });

  it("does not schedule another notice for a duplicate scan", async () => {
    mocks.record.mockResolvedValue({ alreadyCheckedIn: true, at: checkInAt, isLate: true });
    expect(await commitCheckIn("student")).toMatchObject({ status: "already" });
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("schedules the same arrival notice for an accepted device scan", async () => {
    expect(await processScannerBatch("device", [scan])).toEqual({ accepted: [scan.eventId], rejected: [] });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.after).toHaveBeenCalledOnce();

    const [notify] = mocks.after.mock.calls[0] as [() => Promise<void>];
    await notify();
    expect(mocks.send).toHaveBeenCalledWith(["Uparent"], expect.stringContaining("08:08"), expect.any(String));
  });

  it("stores an explicit checkout without inventing a check-in or sending LINE", async () => {
    const checkout = { ...scan, capturedAt: "2026-11-27T12:00:00+07:00", direction: "out" as const };
    vi.setSystemTime(new Date(checkout.capturedAt));

    expect(await processScannerBatch("device", [checkout])).toEqual({ accepted: [scan.eventId], rejected: [] });
    expect(mocks.updateEntry).toHaveBeenCalledWith({
      where: { id: "entry", isDeleted: false, OR: [{ checkOutAt: null }, { checkOutAt: { lt: new Date(checkout.capturedAt) } }] },
      data: { checkOutAt: new Date(checkout.capturedAt) },
    });
    expect(mocks.recordScanOutcome).toHaveBeenCalledWith({
      where: { eventId: checkout.eventId }, data: { result: "checked_out" },
    });
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("acknowledges a replayed checkout without changing attendance or sending LINE", async () => {
    mocks.findScannerEvent.mockResolvedValue({ deviceId: "device", studentId: "student", result: "checked_out" });
    expect(await processScannerBatch("device", [{ ...scan, direction: "out" }])).toEqual({ accepted: [scan.eventId], rejected: [] });
    expect(mocks.updateEntry).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("keeps previous-day device scans from triggering arrival notifications", async () => {
    vi.setSystemTime(new Date("2026-11-28T01:08:00Z"));
    expect(await processScannerBatch("device", [scan])).toEqual({ accepted: [scan.eventId], rejected: [] });
    expect(mocks.after).not.toHaveBeenCalled();
  });
});
