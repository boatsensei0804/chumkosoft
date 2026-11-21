import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const values = new Map<string, string>();
  const redis = {
    status: "ready",
    set: vi.fn(async (key: string, value: string, _ex?: string, _ttl?: number, nx?: string) => {
      if (nx === "NX" && values.has(key)) return null;
      values.set(key, value);
      return "OK";
    }),
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    del: vi.fn(async (key: string) => values.delete(key) ? 1 : 0),
    eval: vi.fn(async (_script: string, _keys: number, key: string, replacement?: string) => {
      const current = values.get(key) ?? "";
      if (replacement !== undefined) {
        if (current !== "pending") return 0;
        values.set(key, replacement);
        return 1;
      }
      if (current.startsWith("approved:")) values.delete(key);
      return current;
    }),
    once: vi.fn(), off: vi.fn(),
  };
  return { values, redis, staff: vi.fn(), reply: vi.fn(), limit: vi.fn() };
});

vi.mock("@/lib/redis", () => ({ getRedis: () => mocks.redis }));
vi.mock("@/lib/prisma", () => ({ default: { staff: { findMany: mocks.staff } } }));
vi.mock("@/lib/line", () => ({ replyText: mocks.reply }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.limit }));

import { startQrLogin, approveQrLogin, claimQrLogin } from "@/features/auth/services/qr-login";
import { handleQrLoginLineMessage } from "@/features/auth/services/qr-login-line";

const lineUserId = `U${"a".repeat(32)}`;

beforeEach(() => {
  mocks.values.clear();
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue({ ok: true });
  mocks.staff.mockResolvedValue([{ user: { id: "staff-user", role: "TEACHER", isActive: true, isDeleted: false } }]);
});

describe("LINE QR login", () => {
  it("binds the approval to one browser and consumes it once", async () => {
    const challenge = await startQrLogin();
    expect(challenge?.code).toMatch(/^[A-F0-9]{16}$/);
    expect(await claimQrLogin("wrong")).toEqual({ state: "expired" });
    expect(await claimQrLogin(challenge!.browserToken)).toEqual({ state: "pending" });
    expect(await approveQrLogin(challenge!.code, "staff-user", lineUserId)).toBe(true);
    expect(await approveQrLogin(challenge!.code, "other-user", lineUserId)).toBe(false);
    expect(await claimQrLogin(challenge!.browserToken)).toEqual({ state: "approved", userId: "staff-user", lineUserId });
    expect(await claimQrLogin(challenge!.browserToken)).toEqual({ state: "expired" });
  });

  it("accepts a LINE message only for a single active linked staff account", async () => {
    const challenge = await startQrLogin();
    expect(await handleQrLoginLineMessage(lineUserId, `LOGIN ${challenge!.code}`, "reply-token")).toBe(true);
    expect(await claimQrLogin(challenge!.browserToken)).toEqual({ state: "approved", userId: "staff-user", lineUserId });
    expect(mocks.reply).toHaveBeenCalledOnce();
    expect(mocks.staff).toHaveBeenCalledWith(expect.objectContaining({ where: { lineUserId, isDeleted: false }, take: 2 }));
  });

  it("does not authorize an unlinked or ambiguous LINE account", async () => {
    const challenge = await startQrLogin();
    mocks.staff.mockResolvedValue([]);
    expect(await handleQrLoginLineMessage(lineUserId, `LOGIN ${challenge!.code}`, "reply-token")).toBe(true);
    expect(await claimQrLogin(challenge!.browserToken)).toEqual({ state: "pending" });
    mocks.staff.mockResolvedValue([{ user: { id: "one", role: "TEACHER", isActive: true, isDeleted: false } }, { user: { id: "two", role: "TEACHER", isActive: true, isDeleted: false } }]);
    expect(await handleQrLoginLineMessage(lineUserId, `LOGIN ${challenge!.code}`, "reply-token-2")).toBe(true);
    expect(await claimQrLogin(challenge!.browserToken)).toEqual({ state: "pending" });
  });

  it("rejects inactive staff accounts and malformed LINE identities", async () => {
    const challenge = await startQrLogin();
    mocks.staff.mockResolvedValue([{ user: { id: "staff-user", role: "TEACHER", isActive: false, isDeleted: false } }]);
    expect(await handleQrLoginLineMessage(lineUserId, `LOGIN ${challenge!.code}`, "reply-token")).toBe(true);
    expect(await approveQrLogin(challenge!.code, "staff-user", "not-a-line-id")).toBe(false);
    expect(await claimQrLogin(challenge!.browserToken)).toEqual({ state: "pending" });
  });
});
