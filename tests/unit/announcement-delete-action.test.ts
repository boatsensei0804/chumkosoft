import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireRoles: vi.fn(), remove: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireRoles: mocks.requireRoles }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/features/line/services/line-announcements", () => ({ deleteLineAnnouncement: mocks.remove }));
import { deleteLineAnnouncementAction } from "@/features/line/announcement-actions";

beforeEach(() => { vi.clearAllMocks(); mocks.requireRoles.mockResolvedValue({ id: "admin" }); mocks.remove.mockResolvedValue({ ok: true, message: "Deleted" }); });
describe("announcement deletion authorization", () => {
  it("requires admin before performing a mutation", async () => {
    mocks.requireRoles.mockRejectedValue(new Error("Forbidden"));
    await expect(deleteLineAnnouncementAction("one")).rejects.toThrow("Forbidden");
    expect(mocks.requireRoles).toHaveBeenCalledWith(["ADMIN"]);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("passes the authenticated actor and refreshes the list after deletion", async () => {
    expect((await deleteLineAnnouncementAction("one")).ok).toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith("one", "admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/line-announcements");
  });
});
