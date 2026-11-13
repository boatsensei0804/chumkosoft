import "server-only";

import type { Prisma } from "@prisma/client";

/** One automatic late adjustment per student and school day. Setting a manual
 * gate correction to on-time changes that day's adjustment to zero. */
export async function syncLateBehaviorPoints(
  tx: Prisma.TransactionClient,
  termId: string,
  studentId: string,
  date: Date,
  isLate: boolean,
  actorUserId?: string,
): Promise<void> {
  const sourceKey = `late:${termId}:${studentId}:${date.toISOString().slice(0, 10)}`;
  const current = await tx.behaviorPointEntry.findUnique({ where: { sourceKey }, select: { delta: true } });
  const delta = isLate ? -10 : 0;
  if (!current && !isLate) return;
  if (current?.delta === delta) return;
  await tx.behaviorPointEntry.upsert({
    where: { sourceKey },
    create: { termId, studentId, source: "LATE_ENTRY", sourceKey, delta, title: "มาสายเข้าโรงเรียน", actorUserId: actorUserId ?? null },
    update: { delta, note: isLate ? null : "ยกเลิกการหักจากการแก้ไขเวลาเข้าเรียน", actorUserId: actorUserId ?? null },
  });
  await tx.auditLog.create({ data: {
    actorId: actorUserId ?? null,
    action: isLate ? "behavior.late.deduct" : "behavior.late.correct",
    targetType: "student", targetId: studentId,
    detail: `${date.toISOString().slice(0, 10)} · ${delta} คะแนน`,
  } });
}
