import "server-only";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import type { ActionResult } from "@/types/form";
import { parseArchiveParent } from "../admin-records";
import type { AdminChange, ArchivedRecord, ArchiveParent, TrashKind, TrashReference } from "../admin-records";

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

function offeringReference(parent: ArchiveParent): Prisma.CourseOfferingWhereInput {
  switch (parent.kind) {
    case "course": return { courseId: parent.id };
    case "room": return { roomId: parent.id };
    case "classroom": return { classroomId: parent.id };
    case "staff": return { teacherId: parent.id };
    case "offering": return { id: parent.id };
  }
}

function slotReference(parent: ArchiveParent): Prisma.TimetableSlotWhereInput {
  switch (parent.kind) {
    case "room": return { roomId: parent.id };
    case "classroom": return { classroomId: parent.id };
    case "staff": return { teacherId: parent.id };
    case "offering": return { courseOfferingId: parent.id };
    case "course": return { courseOffering: { courseId: parent.id } };
  }
}

export async function listArchivedRecords(kind: TrashKind, page: number, parent?: ArchiveParent): Promise<ArchivedRecord[]> {
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
      ...query, where: { ...deleted, ...(parent && offeringReference(parent)) }, select: { ...row, course: { select: { code: true } }, classroom: { select: { code: true } }, term: { select: { name: true } } },
    })).map(({ course, classroom, term, ...record }) => ({ ...record, label: `${course.code} · ${classroom.code} · ${term.name}` }));
    case "slot": return (await prisma.timetableSlot.findMany({
      ...query, where: { ...deleted, ...(parent && slotReference(parent)) }, select: { ...row, dayOfWeek: true, period: { select: { label: true } }, classroom: { select: { code: true } }, courseOffering: { select: { course: { select: { code: true } } } }, term: { select: { name: true } } },
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

const referenceLabels: Record<string, string> = {
  offerings: "รายวิชาที่เปิดสอน", timetableSlots: "คาบในตารางสอน", advisors: "ครูที่ปรึกษา",
  enrollments: "ประวัติการลงทะเบียนเรียน", dailyAttendances: "บันทึกเช็กชื่อประจำห้อง",
  leaveRequests: "คำขอลาและขอมาสาย", classAttendances: "บันทึกเช็กชื่อรายวิชา", user: "บัญชีผู้ใช้",
  schoolEntries: "บันทึกเข้าออกโรงเรียน", behaviorPoints: "รายการคะแนนความประพฤติ", guardians: "ข้อมูลผู้ปกครอง",
  lineAccounts: "บัญชี LINE ที่ผูกไว้", faceTemplates: "ข้อมูลใบหน้าที่ลงทะเบียน", advisories: "ห้องที่ปรึกษา",
  recordedAttendance: "รายการเช็กชื่อรายวิชาที่บันทึก", recordedDailyAttendance: "รายการเช็กชื่อประจำห้องที่บันทึก",
  staff: "ข้อมูลบุคลากรที่เชื่อมกับบัญชี", student: "ข้อมูลนักเรียนที่เชื่อมกับบัญชี", guardianLinks: "ข้อมูลผู้ปกครองที่เชื่อมกับบัญชี",
  scannerDevices: "อุปกรณ์สแกน", reportedEmergencyIncidents: "เหตุฉุกเฉินที่แจ้ง",
  acknowledgedEmergencyIncidents: "เหตุฉุกเฉินที่รับเรื่อง", resolvedEmergencyIncidents: "เหตุฉุกเฉินที่ปิด",
};

async function referenceCounts(tx: Prisma.TransactionClient, kind: TrashKind, id: string): Promise<Record<string, number>> {
  const where = { id };
  const linked = { select: { id: true } } as const;
  switch (kind) {
    case "course": return (await tx.course.findUnique({ where, select: { _count: { select: { offerings: true } } } }))?._count ?? {};
    case "room": return (await tx.room.findUnique({ where, select: { _count: { select: { offerings: true, timetableSlots: true } } } }))?._count ?? {};
    case "classroom": return (await tx.classroom.findUnique({ where, select: { _count: { select: {
      advisors: true, enrollments: true, offerings: true, timetableSlots: true, dailyAttendances: true, leaveRequests: true,
    } } } }))?._count ?? {};
    case "offering": return (await tx.courseOffering.findUnique({ where, select: { _count: { select: {
      timetableSlots: true, classAttendances: true,
    } } } }))?._count ?? {};
    case "slot": return {};
    case "student": {
      const record = await tx.student.findUnique({ where, select: { user: linked, _count: { select: {
        enrollments: true, classAttendances: true, dailyAttendances: true, schoolEntries: true, leaveRequests: true,
        behaviorPoints: true, guardians: true, lineAccounts: true, faceTemplates: true,
      } } } });
      return { ...record?._count, user: Number(Boolean(record?.user)) };
    }
    case "staff": {
      const record = await tx.staff.findUnique({ where, select: { user: linked, _count: { select: {
        advisories: true, offerings: true, timetableSlots: true, recordedAttendance: true, recordedDailyAttendance: true,
      } } } });
      return { ...record?._count, user: Number(Boolean(record?.user)) };
    }
    case "admin": {
      const record = await tx.user.findFirst({ where: { ...where, ...admin }, select: { staffId: true, studentId: true, _count: { select: {
        guardianLinks: true, scannerDevices: true, reportedEmergencyIncidents: true, acknowledgedEmergencyIncidents: true, resolvedEmergencyIncidents: true,
      } } } });
      return { ...record?._count, staff: Number(Boolean(record?.staffId)), student: Number(Boolean(record?.studentId)) };
    }
  }
}

export type PurgeResult = ActionResult & { references?: TrashReference[] };

async function rejectionDetails(tx: Prisma.TransactionClient, kind: TrashKind, id: string): Promise<PurgeResult> {
  const counts = await referenceCounts(tx, kind, id);
  const parent = parseArchiveParent(`${kind}:${id}`, "offering") ?? parseArchiveParent(`${kind}:${id}`, "slot");
  const references = await Promise.all(Object.entries(counts).filter(([, count]) => count > 0).map(async ([key, count]): Promise<TrashReference> => {
    const label = referenceLabels[key];
    if (parent && key === "offerings") {
      return { label, count, archived: await tx.courseOffering.count({ where: { ...deleted, ...offeringReference(parent) } }), trashKind: "offering" };
    }
    if (parent && key === "timetableSlots") {
      return { label, count, archived: await tx.timetableSlot.count({ where: { ...deleted, ...slotReference(parent) } }), trashKind: "slot" };
    }
    return { label, count };
  }));
  return references.length
    ? { ok: false, message: "ยังลบถาวรไม่ได้ เพราะมีรายการต่อไปนี้อ้างอิงอยู่", references }
    : { ok: false, message: "ไม่พบรายการที่ลบถาวรได้ กรุณาโหลดหน้าใหม่" };
}

export async function purgeArchivedRecord(actorId: string, kind: TrashKind, id: string): Promise<PurgeResult> {
  if (kind === "admin" && id === actorId) return { ok: false, message: "ลบบัญชีตัวเองไม่ได้" };
  return prisma.$transaction(async (tx) => {
    if (!await lockAdminAccounts(tx, actorId)) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์จัดการระบบแล้ว" };
    // Hold the parent row against new references until the dependency checks and delete finish.
    const table = Prisma.raw(`"${tableByKind[kind]}"`);
    const records = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM ${table} WHERE id = ${id} AND "isDeleted" FOR UPDATE`;
    if (!records.length) return { ok: false, message: "ไม่พบรายการในถังขยะ" };
    const result = await purgeRow(tx, kind, id);
    if (!result.count) return rejectionDetails(tx, kind, id);
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
