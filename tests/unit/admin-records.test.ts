import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeAdminAccount, purgeArchivedRecord } from "@/features/settings/services/admin-records-service";

const db = vi.hoisted(() => ({
  $executeRaw: vi.fn(), $queryRaw: vi.fn(), user: { findFirst: vi.fn(), count: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
  course: { deleteMany: vi.fn(), findUnique: vi.fn() }, courseOffering: { count: vi.fn() }, auditLog: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: { $transaction: (run: (tx: typeof db) => unknown) => run(db) } }));

beforeEach(() => {
  vi.resetAllMocks();
  db.user.findFirst.mockResolvedValue({ id: "actor", isActive: true });
});

describe("administrator data management", () => {
  it("cannot disable its own admin account", async () => {
    expect((await changeAdminAccount("actor", "actor", "disable")).ok).toBe(false);
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });

  it("protects the last active administrator", async () => {
    db.user.findFirst.mockResolvedValueOnce({ id: "actor" }).mockResolvedValueOnce({ id: "target", isActive: true });
    db.user.count.mockResolvedValue(1);
    expect((await changeAdminAccount("actor", "target", "archive")).ok).toBe(false);
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });

  it("requires an archived record in the hard-delete predicate and preserves references", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "course" }]);
    db.course.deleteMany.mockResolvedValue({ count: 0 });
    db.course.findUnique.mockResolvedValue({ _count: { offerings: 3 } });
    db.courseOffering.count.mockResolvedValue(2);
    const result = await purgeArchivedRecord("actor", "course", "course");
    expect(result).toMatchObject({ ok: false, references: [
      { label: "รายวิชาที่เปิดสอน", count: 3, archived: 2, trashKind: "offering" },
    ] });
    expect(db.course.deleteMany).toHaveBeenCalledWith({ where: { id: "course", isDeleted: true, offerings: { none: {} } } });
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects a revoked administrator before locking or deleting the record", async () => {
    db.user.findFirst.mockResolvedValue(null);
    expect((await purgeArchivedRecord("actor", "course", "course")).ok).toBe(false);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("leaves accounts disabled when restoring them from trash", async () => {
    db.user.findFirst.mockResolvedValueOnce({ id: "actor" }).mockResolvedValueOnce({ id: "target", isActive: false });
    db.user.updateMany.mockResolvedValue({ count: 1 });
    expect((await changeAdminAccount("actor", "target", "restore")).ok).toBe(true);
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: "target", role: "ADMIN", isDeleted: true },
      data: { isActive: false, isDeleted: false, deletedAt: null },
    });
  });

  it("logs successful purges with the actor and record ID", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "course" }]);
    db.course.deleteMany.mockResolvedValue({ count: 1 });
    expect((await purgeArchivedRecord("actor", "course", "course")).ok).toBe(true);
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: { actorId: "actor", action: "trash.purge", targetType: "course", targetId: "course" },
    });
  });
});
