import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeAdminAccount, purgeArchivedRecord } from "@/features/settings/services/admin-records-service";

const db = vi.hoisted(() => ({
  $executeRaw: vi.fn(), $queryRaw: vi.fn(), user: { findFirst: vi.fn(), count: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
  student: { deleteMany: vi.fn(), findUnique: vi.fn() },
  enrollment: { findMany: vi.fn(), deleteMany: vi.fn() },
  guardian: { findMany: vi.fn(), deleteMany: vi.fn() },
  classroom: { deleteMany: vi.fn(), findUnique: vi.fn() },
  course: { deleteMany: vi.fn(), findUnique: vi.fn() }, courseOffering: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() }, timetableSlot: { findMany: vi.fn(), deleteMany: vi.fn() }, auditLog: { create: vi.fn() },
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

  it("lets archived classrooms be deleted with their advisor links while guarding student records and schedules", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "classroom" }]);
    db.classroom.deleteMany.mockImplementation(async ({ where }) => ({ count: where.advisors ? 0 : 1 }));
    db.classroom.findUnique.mockResolvedValue({ _count: { advisors: 2 } });

    expect((await purgeArchivedRecord("actor", "classroom", "classroom")).ok).toBe(true);
    expect(db.classroom.deleteMany).toHaveBeenCalledWith({ where: {
      id: "classroom", isDeleted: true, enrollments: { none: {} }, offerings: { none: {} },
      timetableSlots: { none: {} }, dailyAttendances: { none: {} }, leaveRequests: { none: {} },
    } });
  });

  it("can preview deletion of a classroom with advisor links and archived offerings", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "classroom" }]);
    db.classroom.deleteMany.mockResolvedValue({ count: 0 });
    db.classroom.findUnique.mockImplementation(async ({ select }) => ({
      _count: { ...(select._count.select.advisors && { advisors: 2 }), offerings: 1 },
    }));
    db.courseOffering.count.mockResolvedValue(1);
    db.courseOffering.findMany.mockResolvedValue([{ id: "offering", isDeleted: true, _count: { classAttendances: 0 } }]);
    db.timetableSlot.findMany.mockResolvedValue([]);

    const preview = await purgeArchivedRecord("actor", "classroom", "classroom");
    expect(preview.related).toMatchObject({ offerings: 1, slots: 0 });
    expect(db.courseOffering.deleteMany).not.toHaveBeenCalled();
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

  it("requires confirmation before deleting an archived student's own enrollment records", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "student" }]);
    db.student.deleteMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    db.student.findUnique.mockResolvedValue({ _count: { enrollments: 2 } });
    db.enrollment.findMany.mockResolvedValue([{ id: "first" }, { id: "second" }]);
    db.enrollment.deleteMany.mockResolvedValue({ count: 2 });

    const preview = await purgeArchivedRecord("actor", "student", "student");
    expect(preview).toMatchObject({ ok: false, related: { enrollments: 2 } });
    expect(db.enrollment.deleteMany).not.toHaveBeenCalled();

    const result = await purgeArchivedRecord("actor", "student", "student", preview.related?.token);
    expect(result.ok).toBe(true);
    expect(db.enrollment.deleteMany).toHaveBeenCalledWith({
      where: { studentId: "student", id: { in: ["first", "second"] } },
    });
  });

  it("keeps enrollments when a student's attendance or account must be preserved", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "student" }]);
    db.student.deleteMany.mockResolvedValue({ count: 0 });
    db.student.findUnique.mockResolvedValue({ user: { id: "login" }, _count: { enrollments: 1, dailyAttendances: 1 } });

    const result = await purgeArchivedRecord("actor", "student", "student");
    expect(result).toMatchObject({ ok: false });
    expect(result.related).toBeUndefined();
    expect(db.enrollment.deleteMany).not.toHaveBeenCalled();
  });

  it("requires confirmation before removing a student's archived, unlinked guardian rows", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "student" }]);
    db.student.deleteMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    db.student.findUnique.mockResolvedValue({ _count: { enrollments: 1, guardians: 1 } });
    db.enrollment.findMany.mockResolvedValue([{ id: "enrollment" }]);
    db.guardian.findMany.mockResolvedValue([{ id: "guardian" }]);
    db.enrollment.deleteMany.mockResolvedValue({ count: 1 });
    db.guardian.deleteMany.mockResolvedValue({ count: 1 });

    const preview = await purgeArchivedRecord("actor", "student", "student");
    expect(preview).toMatchObject({ ok: false, related: { enrollments: 1, guardians: 1 } });
    expect(db.guardian.deleteMany).not.toHaveBeenCalled();

    const result = await purgeArchivedRecord("actor", "student", "student", preview.related?.token);
    expect(result.ok).toBe(true);
    expect(db.guardian.deleteMany).toHaveBeenCalledWith({ where: {
      studentId: "student", isDeleted: true, userId: null, lineUserId: null, lineLinkCode: null,
      id: { in: ["guardian"] },
    } });
  });

  it("blocks the student purge when a guardian remains active or linked", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "student" }]);
    db.student.deleteMany.mockResolvedValue({ count: 0 });
    db.student.findUnique.mockResolvedValue({ _count: { guardians: 2 } });
    db.guardian.findMany.mockResolvedValue([{ id: "archived-guardian" }]);

    const result = await purgeArchivedRecord("actor", "student", "student");
    expect(result).toMatchObject({ ok: false, references: [{ count: 2 }] });
    expect(result.related).toBeUndefined();
    expect(db.guardian.deleteMany).not.toHaveBeenCalled();
    expect(db.enrollment.deleteMany).not.toHaveBeenCalled();
  });

  it("requires a new confirmation if the student's enrollments change", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "student" }]);
    db.student.deleteMany.mockResolvedValue({ count: 0 });
    db.student.findUnique.mockResolvedValue({ _count: { enrollments: 1 } });
    db.enrollment.findMany.mockResolvedValueOnce([{ id: "old" }]).mockResolvedValueOnce([{ id: "replacement" }]);

    const preview = await purgeArchivedRecord("actor", "student", "student");
    const result = await purgeArchivedRecord("actor", "student", "student", preview.related?.token);
    expect(result).toMatchObject({ ok: false, related: { enrollments: 1 } });
    expect(result.related?.token).not.toBe(preview.related?.token);
    expect(db.enrollment.deleteMany).not.toHaveBeenCalled();
  });

  it("previews archived children and deletes exactly the approved set bottom-up", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "course" }]);
    db.course.deleteMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    db.course.findUnique.mockResolvedValue({ _count: { offerings: 1 } });
    db.courseOffering.count.mockResolvedValue(1);
    db.courseOffering.findMany.mockResolvedValue([{ id: "offering", isDeleted: true, _count: { classAttendances: 0 } }]);
    db.timetableSlot.findMany.mockResolvedValue([{ id: "archived-slot", isDeleted: true }]);
    db.timetableSlot.deleteMany.mockResolvedValue({ count: 1 });
    db.courseOffering.deleteMany.mockResolvedValue({ count: 1 });
    const preview = await purgeArchivedRecord("actor", "course", "course");
    expect(preview).toMatchObject({ ok: false, related: { offerings: 1, slots: 1 } });
    expect(db.timetableSlot.deleteMany).not.toHaveBeenCalled();
    expect((await purgeArchivedRecord("actor", "course", "course", preview.related?.token)).ok).toBe(true);
    expect(db.timetableSlot.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["archived-slot"] }, isDeleted: true } });
    expect(db.courseOffering.deleteMany).toHaveBeenCalledWith({ where: {
      id: { in: ["offering"] }, isDeleted: true, classAttendances: { none: {} }, timetableSlots: { none: {} },
    } });
  });

  it("withholds the related delete when a child offering has attendance history", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "course" }]);
    db.course.deleteMany.mockResolvedValue({ count: 0 });
    db.course.findUnique.mockResolvedValue({ _count: { offerings: 1 } });
    db.courseOffering.count.mockResolvedValue(1);
    db.courseOffering.findMany.mockResolvedValue([{ id: "offering", isDeleted: true, _count: { classAttendances: 1 } }]);
    const result = await purgeArchivedRecord("actor", "course", "course");
    expect(result.related).toBeUndefined();
    expect(result.message).toMatch(/เช็กชื่อ/);
    expect(db.courseOffering.deleteMany).not.toHaveBeenCalled();
  });

  it("requires a new confirmation if an archived ID changed but the totals did not", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "course" }]);
    db.course.deleteMany.mockResolvedValue({ count: 0 });
    db.course.findUnique.mockResolvedValue({ _count: { offerings: 1 } });
    db.courseOffering.count.mockResolvedValue(1);
    db.courseOffering.findMany.mockResolvedValue([{ id: "offering", isDeleted: true, _count: { classAttendances: 0 } }]);
    db.timetableSlot.findMany.mockResolvedValueOnce([{ id: "first", isDeleted: true }]).mockResolvedValueOnce([{ id: "second", isDeleted: true }]);
    const preview = await purgeArchivedRecord("actor", "course", "course");
    const changed = await purgeArchivedRecord("actor", "course", "course", preview.related?.token);
    expect(changed).toMatchObject({ ok: false, related: { offerings: 1, slots: 1 } });
    expect(changed.related?.token).not.toBe(preview.related?.token);
    expect(db.timetableSlot.deleteMany).not.toHaveBeenCalled();
  });
});
