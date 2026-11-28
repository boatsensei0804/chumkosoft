import { describe, expect, it, vi } from "vitest";
import { getLiveScan } from "@/features/faces/services/live-scan-service";
import { decryptSession, encryptSession } from "@/lib/session";

const { device, events, students } = vi.hoisted(() => ({
  device: vi.fn(), events: vi.fn(), students: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: {
  scannerDevice: { findFirst: device }, scannerSyncEvent: { findMany: events }, student: { findMany: students },
} }));
const viewer = { id: "kiosk-a", role: "KIOSK" } as const;

describe("dedicated kiosk display", () => {
  it("keeps the display token separate from dashboard tokens", async () => {
    vi.stubEnv("SESSION_SECRET", "separate-display-and-dashboard-session-test-key");
    try {
      const payload = { userId: viewer.id, role: viewer.role, expiresAt: new Date().toISOString() };
      const token = await encryptSession(payload, true);
      expect(await decryptSession(token)).toBeNull();
      expect(await decryptSession(token, true)).toEqual(payload);
      expect(await decryptSession(await encryptSession(payload), true)).toBeNull();
    } finally { vi.unstubAllEnvs(); }
  });
  it("scopes devices to the account and skips attendance queries while asleep", async () => {
    device.mockResolvedValue({ displayOverride: "OFF" });
    expect(await getLiveScan(viewer, "device")).toEqual({ paused: true, scan: null, history: [] });
    expect(device.mock.calls.at(-1)?.[0].where).toMatchObject({ kioskUserId: viewer.id, removedAt: null });
    expect(events).not.toHaveBeenCalled();
  });
  it("omits hidden names and times from current and previous scan responses", async () => {
    device.mockResolvedValue({ displayOverride: "ON", showStudentName: false, showScanTime: false, showScanHistory: true });
    const now = new Date();
    events.mockResolvedValue(["checked_out", "checked_in"].map((result, i) => ({
      eventId: String(i), studentId: "student", result, createdAt: now, capturedAt: now,
    })));
    students.mockResolvedValue([{ id: "student", firstName: "Example", lastName: "Student" }]);
    const response = await getLiveScan(viewer, "device");
    expect(response.scan).toMatchObject({ direction: "out", firstName: "", time: "" });
    expect(response.history).toMatchObject([{ direction: "in", firstName: "", time: "" }]);
  });
});
