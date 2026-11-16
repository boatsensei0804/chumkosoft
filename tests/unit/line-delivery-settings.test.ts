import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/dal";
const m = vi.hoisted(() => ({ find: vi.fn(), upsert: vi.fn(), audit: vi.fn(), transaction: vi.fn(), auth: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { lineDeliverySetting: { findUnique: m.find }, $transaction: m.transaction } }));
vi.mock("@/lib/dal", () => ({ requireRoles: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
import { getLineDeliveryState, isLinePushEnabled, setLinePushEnabled } from "@/features/line/services/line-delivery-settings";
import { saveLineDeliveryAction } from "@/features/line/delivery-actions";
const admin = { id: "admin", role: "ADMIN" } as CurrentUser;
beforeEach(() => {
  vi.resetAllMocks(); m.auth.mockResolvedValue(admin);
  m.transaction.mockImplementation(async fn => fn({ lineDeliverySetting: { upsert: m.upsert }, auditLog: { create: m.audit } }));
  m.upsert.mockImplementation(async args => ({ pushEnabled: args.update.pushEnabled, updatedAt: new Date("2026-11-16T00:00:00Z") }));
});
describe("durable LINE delivery control", () => {
  it("preserves existing behavior before first configuration and reads current DB state on every send", async () => {
    m.find.mockResolvedValueOnce(null).mockResolvedValueOnce({ pushEnabled: false, updatedAt: new Date() }).mockResolvedValueOnce({ pushEnabled: true, updatedAt: new Date() });
    expect(await isLinePushEnabled()).toBe(true); expect(await isLinePushEnabled()).toBe(false); expect(await isLinePushEnabled()).toBe(true);
    expect(m.find).toHaveBeenCalledTimes(3);
  });
  it("fails closed if the delivery setting cannot be read", async () => {
    m.find.mockRejectedValue(new Error("database down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getLineDeliveryState()).toEqual({ enabled: false, available: false, updatedAt: null });
    expect(await isLinePushEnabled()).toBe(false); log.mockRestore();
  });
  it("persists pause and resume with actor/audit in the same transaction", async () => {
    expect((await setLinePushEnabled(false, admin)).enabled).toBe(false);
    expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 }, update: { pushEnabled: false, updatedByUserId: "admin" } }));
    expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: "admin", action: "line.delivery.pause" }) });
    expect((await setLinePushEnabled(true, admin)).enabled).toBe(true);
    expect(m.audit).toHaveBeenLastCalledWith({ data: expect.objectContaining({ action: "line.delivery.resume" }) });
  });
  it("rejects non-admins at both action and service boundaries without a write", async () => {
    await expect(setLinePushEnabled(false, { role: "TEACHER" } as CurrentUser)).rejects.toThrow("Forbidden");
    m.auth.mockRejectedValue(new Error("Forbidden"));
    await expect(saveLineDeliveryAction(false)).rejects.toThrow("Forbidden");
    expect(m.auth).toHaveBeenCalledWith(["ADMIN"]); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("validates untrusted values and refreshes all control surfaces after saving", async () => {
    expect((await saveLineDeliveryAction("false" as unknown as boolean)).ok).toBe(false); expect(m.transaction).not.toHaveBeenCalled();
    expect(await saveLineDeliveryAction(false)).toMatchObject({ ok: true, state: { enabled: false } });
    for (const path of ["/dashboard/line", "/dashboard/line-announcements", "/dashboard/settings"]) expect(m.revalidate).toHaveBeenCalledWith(path);
  });
});
