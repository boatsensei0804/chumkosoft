import "server-only";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import type { ActionResult } from "@/types/form";
import type { AdminChange, ArchivedRecord, TrashKind } from "../admin-records";

const deleted = { isDeleted: true } as const;
const admin = { role: "ADMIN" as const };
const activeAdmin = { ...admin, isActive: true, isDeleted: false };
const order = [{ deletedAt: "desc" as const }, { id: "desc" as const }];
const row = { id: true, deletedAt: true } as const;
const name = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;

export function listAdminAccounts() {
  return prisma.user.findMany({
    where: { ...admin, isDeleted: false },
    select: { id: true, email: true, isActive: true },
    orderBy: { email: "asc" },
  });
}

export const trashPageSize = 30;

export async function listArchivedRecords(kind: TrashKind, page: number): Promise<ArchivedRecord[]> {
  const query = { where: deleted, orderBy: order, skip: (page - 1) * trashPageSize, take: trashPageSize + 1 };
  switch (kind) {
    case "course": return (await prisma.course.findMany({ ...query, select: { ...row, code: true, name: true } }))
      .map(({ code, name, ...record }) => ({ ...record, label: `${code} · ${name}` }));
    case "room": return (await prisma.room.findMany({ ...query, select: { ...row, code: true, name: true } }))
      .map(({ code, name, ...record }) => ({ ...record, label: [code, name].filter(Boolean).join(" · ") }));
    case "classroom": return (await prisma.classroom.findMany({
      ...query, select: { ...row, code: true, academicYear: { select: { buddhistYear: true } } },
    })).map(({ code, academicYear, ...record }) => ({ ...record, label: `${code} · ${academicYear.buddhistYear}` }));
    case "offering": return (await prisma.courseOffering.findMany({
      ...query, select: { ...row, course: { select: { code: true } }, classroom: { select: { code: true } }, term: { select: { name: true } } },
    })).map(({ course, classroom, term, ...record }) => ({ ...record, label: `${course.code} · ${classroom.code} · ${term.name}` }));
    case "slot": return (await prisma.timetableSlot.findMany({
      ...query, select: { ...row, dayOfWeek: true, period: { select: { label: true } }, classroom: { select: { code: true } }, courseOffering: { select: { course: { select: { code: true } } } }, term: { select: { name: true } } },
    })).map(({ dayOfWeek, period, classroom, courseOffering, term, ...record }) => ({
      ...record, label: `${courseOffering.course.code} · ${classroom.code} · ${slotDays[dayOfWeek]} ${period.label} · ${term.name}`,
    }));
    case "student": return (await prisma.student.findMany({ ...query, select: { ...row, studentCode: true, firstName: true, lastName: true } }))
      .map(({ id, deletedAt, ...person }) => ({ id, deletedAt, label: `${person.studentCode} · ${name(person)}` }));
    case "staff": return (await prisma.staff.findMany({ ...query, select: { ...row, staffCode: true, firstName: true, lastName: true } }))
      .map(({ id, deletedAt, ...person }) => ({ id, deletedAt, label: `${person.staffCode} · ${name(person)}` }));
    case "admin": return (await prisma.user.findMany({ ...query, where: { ...deleted, ...admin }, select: { ...row, email: true } }))
      .map(({ email, ...record }) => ({ ...record, label: email }));
  }
}

const slotDays = { MON: "จันทร์", TUE: "อังคาร", WED: "พุธ", THU: "พฤหัสบดี", FRI: "ศุกร์", SAT: "เสาร์", SUN: "อาทิตย์" };
const tableByKind: Record<TrashKind, string> = {
  course: "Course", room: "Room", classroom: "Classroom", offering: "CourseOffering", slot: "TimetableSlot",
  student: "Student", staff: "Staff", admin: "User",
};

async function lockAdminAccounts(tx: Prisma.TransactionClient, actorId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('chumkosoft-admin-accounts', 0))`;
  return tx.user.findFirst({ where: { ...activeAdmin, id: actorId }, select: { id: true } });
}

async function purgeRow(tx: Prisma.TransactionClient, kind: TrashKind, id: string) {
  const where = { ...deleted, id };
  switch (kind) {
    case "course": return tx.course.deleteMany({ where: { ...where, offerings: { none: {} } } });
    case "room": return tx.room.deleteMany({ where: { ...where, offerings: { none: {} }, timetableSlots: { none: {} } } });
    case "classroom": return tx.classroom.deleteMany({ where: {
      ...where, advisors: { none: {} }, enrollments: { none: {} }, offerings: { none: {} }, timetableSlots: { none: {} },
      dailyAttendances: { none: {} }, leaveRequests: { none: {} },
    } });
    case "offering": return tx.courseOffering.deleteMany({ where: { ...where, timetableSlots: { none: {} }, classAttendances: { none: {} } } });
    case "slot": return tx.timetableSlot.deleteMany({ where });
    case "student": return tx.student.deleteMany({ where: {
      ...where, user: { is: null }, enrollments: { none: {} }, classAttendances: { none: {} }, dailyAttendances: { none: {} },
      schoolEntries: { none: {} }, leaveRequests: { none: {} }, behaviorPoints: { none: {} }, guardians: { none: {} },
      lineAccounts: { none: {} }, faceTemplates: { none: {} },
    } });
    case "staff": return tx.staff.deleteMany({ where: {
      ...where, user: { is: null }, advisories: { none: {} }, offerings: { none: {} }, timetableSlots: { none: {} },
      recordedAttendance: { none: {} }, recordedDailyAttendance: { none: {} },
    } });
    case "admin": return tx.user.deleteMany({ where: {
      ...where, ...admin, staffId: null, studentId: null, guardianLinks: { none: {} }, scannerDevices: { none: {} }, reportedEmergencyIncidents: { none: {} },
      acknowledgedEmergencyIncidents: { none: {} }, resolvedEmergencyIncidents: { none: {} },
    } });
  }
}

export async function purgeArchivedRecord(actorId: string, kind: TrashKind, id: string): Promise<ActionResult> {
  if (kind === "admin" && id === actorId) return { ok: false, message: "ลบบัญชีตัวเองไม่ได้" };
  return prisma.$transaction(async (tx) => {
    if (!await lockAdminAccounts(tx, actorId)) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์จัดการระบบแล้ว" };
    // Hold the parent row against new references until the dependency checks and delete finish.
    const table = Prisma.raw(`"${tableByKind[kind]}"`);
    const records = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM ${table} WHERE id = ${id} AND "isDeleted" FOR UPDATE`;
    if (!records.length) return { ok: false, message: "ไม่พบรายการในถังขยะ" };
    const result = await purgeRow(tx, kind, id);
    if (!result.count) return { ok: false, message: "ลบถาวรไม่ได้ เพราะยังมีข้อมูลอ้างอิงหรือรายการไม่ตรงประเภท" };
    await tx.auditLog.create({ data: { actorId, action: "trash.purge", targetType: kind, targetId: id } });
    return { ok: true, message: "ลบถาวรแล้ว" };
  });
}

export async function changeAdminAccount(actorId: string, id: string, change: AdminChange): Promise<ActionResult> {
  if (id === actorId) return { ok: false, message: "จัดการสถานะบัญชีตัวเองจากหน้านี้ไม่ได้" };
  return prisma.$transaction(async (tx) => {
    if (!await lockAdminAccounts(tx, actorId)) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์จัดการระบบแล้ว" };
    const where = { ...admin, id, isDeleted: change === "restore" };
    const target = await tx.user.findFirst({ where, select: { id: true, isActive: true } });
    if (!target) return { ok: false, message: "ไม่พบบัญชีแอดมินในสถานะนี้" };
    if (target.isActive && (change === "disable" || change === "archive") && await tx.user.count({ where: activeAdmin }) <= 1) {
      return { ok: false, message: "ระบบต้องมีแอดมินที่เปิดใช้งานอย่างน้อยหนึ่งบัญชี" };
    }
    const data = {
      enable: { isActive: true },
      disable: { isActive: false },
      archive: { isActive: false, isDeleted: true, deletedAt: new Date() },
      restore: { isActive: false, isDeleted: false, deletedAt: null },
    }[change];
    const result = await tx.user.updateMany({ where, data });
    if (!result.count) return { ok: false, message: "สถานะบัญชีเปลี่ยนไปแล้ว กรุณาเปิดหน้าใหม่" };
    await tx.auditLog.create({ data: { actorId, action: `admin.account.${change}`, targetType: "user", targetId: id } });
    return { ok: true, message: change === "restore" ? "กู้บัญชีแล้ว คุณสามารถเปิดใช้งานได้จากหน้าบัญชีแอดมิน" : "บันทึกสถานะบัญชีแล้ว" };
  });
}

export async function saveAdminAccount(actorId: string, id: string | null, email: string, password: string): Promise<ActionResult> {
  if (id === actorId) return { ok: false, message: "แก้บัญชีตัวเองจากหน้านี้ไม่ได้" };
  const passwordHash = id ? null : await hashPassword(password);
  return prisma.$transaction(async (tx) => {
    if (!await lockAdminAccounts(tx, actorId)) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์จัดการระบบแล้ว" };
    const targetId = id ?? (await tx.user.create({ data: { ...admin, email, passwordHash: passwordHash! }, select: { id: true } })).id;
    if (id) {
      const result = await tx.user.updateMany({ where: { ...admin, id, isDeleted: false }, data: { email } });
      if (!result.count) return { ok: false, message: "ไม่พบบัญชีแอดมินที่ต้องการแก้ไข" };
    }
    await tx.auditLog.create({ data: { actorId, action: id ? "admin.account.update" : "admin.account.create", targetType: "user", targetId } });
    return { ok: true, message: id ? "อัปเดตอีเมลแล้ว" : "สร้างบัญชีแอดมินแล้ว" };
  });
}
