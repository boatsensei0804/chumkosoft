import "server-only";
import type { Prisma } from "@prisma/client";

function dayKey(termId: string, studentId: string, date: Date): string {
  return `late:${termId}:${studentId}:${date.toISOString().slice(0, 10)}`;
}

/** Serialize approvals and scan penalties for the same student/day across workers. */
export async function lockLateBehaviorDay(tx: Prisma.TransactionClient, termId: string, studentId: string, date: Date): Promise<void> {
  const key = dayKey(termId, studentId, date);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

/** Preserve the actual scan's late flag; approval exempts only the automatic points. */
export async function syncLateBehaviorPoints(tx: Prisma.TransactionClient, termId: string, studentId: string, date: Date, isLate: boolean, actorUserId?: string): Promise<void> {
  await lockLateBehaviorDay(tx, termId, studentId, date);
  const sourceKey = dayKey(termId, studentId, date);
  const current = await tx.behaviorPointEntry.findUnique({ where: { sourceKey }, select: { delta: true } });
  const permission = isLate ? await tx.leaveRequest.findFirst({ where: { termId, studentId, kind: "LATE", status: "APPROVED", startDate: date, endDate: date }, select: { id: true } }) : null;
  const exempt = Boolean(permission);
  const delta = isLate && !exempt ? -10 : 0;
  if (!current && delta === 0) return;
  if (current?.delta === delta) return;
  const note = exempt ? "ยกเว้นคะแนนมาสายตามคำขอที่ครูอนุมัติ" : isLate ? null : "ยกเลิกการหักจากการแก้ไขเวลาเข้าเรียน";
  await tx.behaviorPointEntry.upsert({
    where: { sourceKey },
    create: { termId, studentId, source: "LATE_ENTRY", sourceKey, delta, title: "มาสายเข้าโรงเรียน", note, actorUserId: actorUserId ?? null },
    update: { delta, note, actorUserId: actorUserId ?? null },
  });
  await tx.auditLog.create({ data: {
    actorId: actorUserId ?? null, action: exempt ? "behavior.late.exempt" : isLate ? "behavior.late.deduct" : "behavior.late.correct",
    targetType: "student", targetId: studentId, detail: `${date.toISOString().slice(0, 10)} · ${delta} คะแนน${permission ? ` · ${permission.id}` : ""}`,
  } });
}

/** Caller has approved the request inside this transaction. Never create a bonus. */
export async function refundApprovedLatePoints(tx: Prisma.TransactionClient, termId: string, studentId: string, date: Date, actorUserId: string): Promise<void> {
  await lockLateBehaviorDay(tx, termId, studentId, date);
  const sourceKey = dayKey(termId, studentId, date);
  const changed = await tx.behaviorPointEntry.updateMany({ where: { sourceKey, source: "LATE_ENTRY", delta: { lt: 0 } }, data: { delta: 0, note: "คืนคะแนนมาสายตามคำขอที่ครูอนุมัติ", actorUserId } });
  if (changed.count) await tx.auditLog.create({ data: { actorId: actorUserId, action: "behavior.late.refund", targetType: "student", targetId: studentId, detail: `${date.toISOString().slice(0, 10)} · ยกเว้นการหักคะแนนอัตโนมัติ` } });
}
