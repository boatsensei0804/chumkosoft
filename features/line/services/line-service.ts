import "server-only";

import { randomInt } from "node:crypto";
import * as repo from "@/features/line/repositories/line-repository";
import * as guardianRepo from "@/features/guardians/repositories/guardian-repository";
import { pushText, replyText } from "@/lib/line";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/types/form";

/** Pushes a gate check-in notification to every linked guardian of the student. */
export async function notifyGuardiansOfCheckIn(studentId: string, studentName: string, time: string, overrideBody?: string): Promise<void> {
  const targets = await repo.findLineTargets(studentId);
  if (targets.length === 0) return;
  const body = overrideBody ?? `${studentName} เข้าโรงเรียนแล้วเมื่อเวลา ${time} น.`;
  const message = `แจ้งเตือนการเข้าโรงเรียน\n${body}`;
  await Promise.all(targets.map((to) => pushText(to, message)));
}

/** Generates a fresh 6-digit link code for a guardian and returns it. */
export async function generateLinkCode(guardianId: string): Promise<ActionResult & { code?: string }> {
  const guardian = await repo.getGuardian(guardianId);
  if (!guardian) return { ok: false, message: "ไม่พบผู้ปกครอง" };
  const code = String(randomInt(100000, 1000000));
  await repo.setLinkCode(guardianId, code);
  return { ok: true, message: "สร้างรหัสผูกบัญชีแล้ว", code };
}

/** Generate missing link codes for every not-yet-linked guardian in a classroom. */
export async function prepareClassroomLinkCodes(classroomId: string): Promise<ActionResult & { created?: number }> {
  const rows = await guardianRepo.findClassroomGuardiansForPrint(classroomId);
  const needsCode = rows.flatMap((student) => student.guardians)
    .filter((guardian) => !guardian.lineUserId && !guardian.lineLinkCode);
  const used = new Set<string>();
  const updates = needsCode.map((guardian) => {
    let code = String(randomInt(100000, 1000000));
    while (used.has(code)) code = String(randomInt(100000, 1000000));
    used.add(code);
    return { id: guardian.id, code };
  });
  const created = await guardianRepo.updateMissingGuardianLinkCodes(updates);
  return { ok: true, created, message: `เตรียมรหัสใหม่ ${created} ราย · คงรหัสเดิมที่ยังไม่ถูกใช้ไว้แล้ว` };
}

export async function unlinkGuardianLine(guardianId: string): Promise<ActionResult> {
  const guardian = await repo.getGuardian(guardianId);
  if (!guardian) return { ok: false, message: "ไม่พบผู้ปกครอง" };
  await repo.unlinkGuardian(guardianId);
  return { ok: true, message: "ยกเลิกการเชื่อม LINE แล้ว" };
}

/**
 * Handles an inbound LINE text message: if it matches a pending link code, binds
 * that guardian to the sender's LINE user id and replies. Safe to call for every
 * message; unrelated text is ignored.
 */
export async function handleLinkMessage(lineUserId: string, text: string, replyToken: string): Promise<void> {
  const code = text.trim();
  if (!/^\d{6}$/.test(code)) return;

  const guardian = await repo.findGuardianByLinkCode(code);
  if (!guardian) {
    await replyText(replyToken, "ไม่พบรหัสผูกบัญชีนี้ กรุณาตรวจสอบรหัสกับทางโรงเรียนอีกครั้ง");
    return;
  }

  await repo.linkGuardian(guardian.id, lineUserId);
  await logAudit({ action: "line.link", targetType: "guardian", targetId: guardian.id, detail: guardian.fullName });
  const childName = `${guardian.student.firstName} ${guardian.student.lastName}`;
  await replyText(replyToken, `ผูกบัญชีสำเร็จ ✅\nคุณจะได้รับแจ้งเตือนเมื่อ ${childName} เข้าโรงเรียน`);
}

