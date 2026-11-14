import "server-only";

import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CurrentUser } from "@/lib/dal";

export async function getBehaviorOverview(selectedStudentId?: string, user?: CurrentUser) {
  const term = await prisma.term.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true, name: true } });
  if (!term) return { term: null, students: [], selectedStudent: null, history: [] };
  const enrollments = await prisma.enrollment.findMany({
    where: { termId: term.id, status: "ACTIVE", isDeleted: false, student: { isDeleted: false }, classroom: { isDeleted: false } },
    select: { student: { select: { id: true, studentCode: true, firstName: true, lastName: true } }, classroom: { select: { code: true } } },
    orderBy: { student: { studentCode: "asc" } },
  });
  const byId = new Map(enrollments.map((row) => [row.student.id, {
    id: row.student.id, code: row.student.studentCode, name: `${row.student.firstName} ${row.student.lastName}`, classroom: row.classroom.code,
  }]));
  const students = [...byId.values()];
  const pointTotals = await prisma.behaviorPointEntry.groupBy({
    by: ["studentId"], where: { termId: term.id, studentId: { in: students.map((student) => student.id) } }, _sum: { delta: true },
  });
  const totals = new Map(pointTotals.map((row) => [row.studentId, row._sum.delta ?? 0]));
  const summaries = students.map((student) => ({ ...student, score: 100 + (totals.get(student.id) ?? 0) }));
  const selectedStudent = summaries.find((student) => student.id === selectedStudentId) ?? null;
  if (!selectedStudent) return { term, students: summaries, selectedStudent: null, history: [] };
  const entries = await prisma.behaviorPointEntry.findMany({
    where: { termId: term.id, studentId: selectedStudent.id }, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, delta: true, source: true, title: true, note: true, actorUserId: true, createdAt: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: entries.flatMap((entry) => entry.actorUserId ? [entry.actorUserId] : []) } },
    select: { id: true, email: true, staff: { select: { firstName: true, lastName: true } } },
  });
  const names = new Map(users.map((user) => [user.id, user.staff ? `${user.staff.firstName} ${user.staff.lastName}` : user.email]));
  const history = entries.map((entry) => ({
    id: entry.id, delta: entry.delta, source: entry.source, title: entry.title, note: entry.note,
    canManage: entry.source === "MANUAL" && Boolean(user && (user.role === "ADMIN" || entry.actorUserId === user.id)),
    actorName: entry.actorUserId ? names.get(entry.actorUserId) ?? "ผู้ใช้งาน" : "ระบบ", createdAt: entry.createdAt.toISOString(),
  }));
  return { term, students: summaries, selectedStudent, history };
}

export async function updateManualBehaviorPoints(input: { id: string; direction: "ADD" | "DEDUCT"; points: number; title: string; note: string }, user: CurrentUser): Promise<{ ok: boolean; message: string }> {
  const title = input.title.trim();
  const note = input.note.trim();
  if (!input.id || !["ADD", "DEDUCT"].includes(input.direction) || !Number.isInteger(input.points) || input.points < 1 || input.points > 100 || title.length < 3 || title.length > 120 || note.length > 500) return { ok: false, message: "กรุณาตรวจข้อมูลคะแนนและหัวข้ออีกครั้ง" };
  const entry = await prisma.behaviorPointEntry.findFirst({ where: { id: input.id, source: "MANUAL" }, select: { id: true, studentId: true, actorUserId: true, delta: true, title: true } });
  if (!entry) return { ok: false, message: "ไม่พบรายการคะแนนที่แก้ไขได้" };
  if (user.role !== "ADMIN" && entry.actorUserId !== user.id) return { ok: false, message: "แก้ไขได้เฉพาะรายการที่คุณบันทึกเอง" };
  const delta = input.direction === "ADD" ? input.points : -input.points;
  await prisma.behaviorPointEntry.update({ where: { id: entry.id }, data: { delta, title, note: note || null } });
  await logAudit({ actorId: user.id, action: "behavior.points.manual.update", targetType: "behaviorPointEntry", targetId: entry.id, detail: `${entry.delta} · ${entry.title} → ${delta} · ${title}` });
  return { ok: true, message: "แก้ไขรายการคะแนนแล้ว" };
}

export async function deleteManualBehaviorPoints(id: string, user: CurrentUser): Promise<{ ok: boolean; message: string }> {
  if (!id) return { ok: false, message: "ไม่พบรายการคะแนน" };
  const entry = await prisma.behaviorPointEntry.findFirst({ where: { id, source: "MANUAL" }, select: { id: true, studentId: true, actorUserId: true, delta: true, title: true } });
  if (!entry) return { ok: false, message: "ไม่พบรายการคะแนนที่ลบได้" };
  if (user.role !== "ADMIN" && entry.actorUserId !== user.id) return { ok: false, message: "ลบได้เฉพาะรายการที่คุณบันทึกเอง" };
  const deleted = await prisma.behaviorPointEntry.deleteMany({ where: { id, source: "MANUAL", ...(user.role === "ADMIN" ? {} : { actorUserId: user.id }) } });
  if (!deleted.count) return { ok: false, message: "รายการนี้ถูกเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่" };
  await logAudit({ actorId: user.id, action: "behavior.points.manual.delete", targetType: "behaviorPointEntry", targetId: id, detail: `${entry.studentId} · ${entry.delta} · ${entry.title}` });
  return { ok: true, message: "ลบรายการคะแนนที่บันทึกผิดแล้ว" };
}

export async function addManualBehaviorPoints(input: { studentId: string; direction: "ADD" | "DEDUCT"; points: number; title: string; note: string; requestId: string }, user: CurrentUser): Promise<{ ok: boolean; message: string }> {
  const title = input.title.trim();
  const note = input.note.trim();
  if (!input.studentId || !["ADD", "DEDUCT"].includes(input.direction) || !Number.isInteger(input.points) || input.points < 1 || input.points > 100 || title.length < 3 || title.length > 120 || note.length > 500 || !/^[0-9a-f-]{36}$/i.test(input.requestId)) {
    return { ok: false, message: "กรุณากรอกจำนวนคะแนน 1–100 และหัวข้ออย่างน้อย 3 ตัวอักษร" };
  }
  const term = await prisma.term.findFirst({ where: { isActive: true, isDeleted: false }, select: { id: true } });
  if (!term) return { ok: false, message: "ยังไม่มีภาคเรียนที่ใช้งาน" };
  const enrollment = await prisma.enrollment.findFirst({ where: { termId: term.id, studentId: input.studentId, status: "ACTIVE", isDeleted: false, student: { isDeleted: false } }, select: { id: true } });
  if (!enrollment) return { ok: false, message: "นักเรียนไม่ได้ลงทะเบียนในภาคเรียนนี้" };
  const delta = input.direction === "ADD" ? input.points : -input.points;
  const sourceKey = `manual:${input.requestId}`;
  const existing = await prisma.behaviorPointEntry.findUnique({ where: { sourceKey }, select: { id: true } });
  if (existing) return { ok: true, message: "รายการนี้บันทึกไว้แล้ว" };
  const entry = await prisma.behaviorPointEntry.create({ data: {
    studentId: input.studentId, termId: term.id, source: "MANUAL", sourceKey, delta, title, note: note || null, actorUserId: user.id,
  } });
  await logAudit({ actorId: user.id, action: "behavior.points.manual", targetType: "student", targetId: input.studentId, detail: `${delta > 0 ? "+" : ""}${delta} · ${title} · ${entry.id}` });
  return { ok: true, message: `บันทึก${delta > 0 ? "เพิ่ม" : "หัก"} ${input.points} คะแนนแล้ว` };
}
