import { afterEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  count: vi.fn().mockResolvedValue(0),
  outbound: vi.fn(),
  announcements: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    lineOutboundMessage: { count: db.count, findMany: db.outbound },
    lineAnnouncement: { findMany: db.announcements },
  },
}));

import { getLineApiSummary } from "@/features/line/services/message-api-summary";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("keeps local delivery history available when the external quota API is offline", async () => {
  vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "test-token");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const localRow = { id: "outbound-1", status: "FAILED", kind: "ATTENDANCE" };
  db.outbound.mockResolvedValueOnce([localRow]).mockResolvedValueOnce([]);

  const result = await getLineApiSummary({ kind: "ATTENDANCE", status: "FAILED", date: "2026-11-22" });

  expect(result.quota).toBeNull();
  expect(result.error).toBeTruthy();
  expect(result.recent).toEqual([localRow]);
  expect(db.outbound).toHaveBeenNthCalledWith(1, expect.objectContaining({
    where: {
      kind: "ATTENDANCE",
      status: "FAILED",
      createdAt: { gte: new Date("2026-11-21T17:00:00Z"), lt: new Date("2026-11-22T17:00:00Z") },
    },
  }));
});
