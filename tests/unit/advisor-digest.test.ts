import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { sendAdvisorDigests } from "@/features/line/services/advisor-digest";

const mocks = vi.hoisted(() => ({
  setting: vi.fn(), advisors: vi.fn(), rooms: vi.fn(), roster: vi.fn(),
  send: vi.fn(), findReceipt: vi.fn(), upsertReceipt: vi.fn(), redis: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    advisorDigestSetting: { findUnique: mocks.setting },
    staff: { findMany: mocks.advisors },
    lineOutboundMessage: { findUnique: mocks.findReceipt, upsert: mocks.upsertReceipt },
  },
}));
vi.mock("@/lib/redis", () => ({ getRedis: mocks.redis }));
vi.mock("@/lib/line", () => ({ sendLineTextToUsers: mocks.send, isLineConfigured: () => true }));
vi.mock("@/features/line/services/line-delivery-settings", () => ({ isLinePushEnabled: async () => true }));
vi.mock("@/features/attendance/services/school-entry-service", () => ({
  listEntryClassrooms: mocks.rooms, getSchoolEntryRoster: mocks.roster,
}));

const accepted = { accepted: true, code: "HTTP_200", requestId: "accepted", acceptedRequestId: null };
const redis = Object.assign(new EventEmitter(), { status: "ready", set: vi.fn(), del: vi.fn() });

beforeEach(() => {
  vi.useFakeTimers();
  mocks.setting.mockResolvedValue({ sendTime: "09:30" });
  mocks.advisors.mockResolvedValue([{ id: "advisor", lineUserId: "Uadvisor" }]);
  mocks.rooms.mockResolvedValue([{ code: "M1/1" }]);
  mocks.roster.mockResolvedValue({ students: [] });
  redis.status = "ready";
  redis.set.mockResolvedValue("OK");
  mocks.redis.mockReturnValue(redis);
  mocks.findReceipt.mockResolvedValue(null);
  mocks.send.mockResolvedValue(accepted);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("advisor digest", () => {
  it("uses the saved Bangkok time and skips a digest before it is due", async () => {
    vi.setSystemTime(new Date("2026-11-27T02:29:59Z"));
    expect(await sendAdvisorDigests()).toEqual({ sent: 0, failed: 0 });
    expect(mocks.send).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-11-27T02:30:00Z"));
    expect(await sendAdvisorDigests()).toEqual({ sent: 1, failed: 0 });
    expect(mocks.roster).toHaveBeenCalledWith("2026-11-27", "", "advisor");
  });

  it("uses the Bangkok school day at UTC date boundaries", async () => {
    mocks.setting.mockResolvedValue({ sendTime: "00:00" });
    vi.setSystemTime(new Date("2026-11-27T17:00:00Z")); // Saturday 00:00 in Bangkok
    expect(await sendAdvisorDigests()).toEqual({ sent: 0, failed: 0 });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("reuses a LINE retry key after a temporary network failure", async () => {
    vi.setSystemTime(new Date("2026-11-27T02:30:00Z"));
    mocks.send.mockResolvedValueOnce({
      accepted: false, code: "NETWORK_ERROR", requestId: null, acceptedRequestId: null,
    });
    expect(await sendAdvisorDigests()).toEqual({ sent: 0, failed: 1 });

    vi.setSystemTime(new Date("2026-11-27T02:31:00Z"));
    expect(await sendAdvisorDigests()).toEqual({ sent: 1, failed: 0 });
    expect(mocks.send.mock.calls[0][2]).toBe(mocks.send.mock.calls[1][2]);
  });

  it("skips a digest already accepted by LINE if Redis lost the sent marker", async () => {
    vi.setSystemTime(new Date("2026-11-27T02:30:00Z"));
    mocks.findReceipt.mockResolvedValue({ status: "ACCEPTED" });
    expect(await sendAdvisorDigests()).toEqual({ sent: 0, failed: 0 });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("waits for Redis on the first scheduled request following an app restart", async () => {
    vi.setSystemTime(new Date("2026-11-27T02:30:00Z"));
    redis.status = "connecting";
    redis.set.mockImplementation(async () => {
      if (redis.status !== "ready") throw new Error("Stream isn't writeable and enableOfflineQueue options is false");
      return "OK";
    });

    const result = sendAdvisorDigests().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(0);
    redis.status = "ready";
    redis.emit("ready");
    expect(await result).toEqual({ sent: 1, failed: 0 });
  });
});
