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
  let code = String(randomInt(100000, 1000000));
  while (await repo.lineCodeExists(code)) code = String(randomInt(100000, 1000000));
  await repo.setLinkCode(guardianId, code);
  return { ok: true, message: "สร้างรหัสผูกบัญชีแล้ว", code };
}

/** Creates a one-time LINE code for a student, without requiring a guardian record. */
export async function generateStudentLinkCode(studentId: string): Promise<ActionResult & { code?: string }> {
  const student = await guardianRepo.getStudentIdentity(studentId);
  if (!student) return { ok: false, message: "ไม่พบนักเรียน" };
  let code = String(randomInt(100000, 1000000));
  while (await repo.lineCodeExists(code)) code = String(randomInt(100000, 1000000));
  await repo.createStudentLinkCode(studentId, code);
  return { ok: true, message: `สร้างรหัสสำหรับผู้ปกครองของ ${student.firstName} ${student.lastName} แล้ว`, code };
}

export async function generateAdvisorLinkCode(staffId: string): Promise<ActionResult & { code?: string }> {
  const advisor = await repo.getAdvisorLine(staffId);
  if (!advisor) return { ok: false, message: "ไม่พบบัญชีครู" };
  if (advisor.lineUserId) return { ok: false, message: "บัญชี LINE นี้เชื่อมแล้ว" };
  let code = String(randomInt(100000, 1000000));
  while (await repo.lineCodeExists(code)) code = String(randomInt(100000, 1000000));
  await repo.setAdvisorLinkCode(staffId, code);
  return { ok: true, code };
}

/** Generate missing link codes for every not-yet-linked guardian in a classroom. */
export async function prepareClassroomLinkCodes(classroomId: string): Promise<ActionResult & { created?: number }> {
  const rows = await guardianRepo.findClassroomGuardiansForPrint(classroomId);
  let created = 0;
  for (const student of rows) {
    if (student.lineAccounts.length > 0) continue;
    let code = String(randomInt(100000, 1000000));
    while (await repo.lineCodeExists(code)) code = String(randomInt(100000, 1000000));
    await repo.createStudentLinkCode(student.id, code);
    created += 1;
  }
  return { ok: true, created, message: `เตรียมรหัสให้นักเรียนใหม่ ${created} คน · คงรหัสเดิมไว้` };
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
  if (guardian) {
    await repo.linkGuardian(guardian.id, lineUserId);
    await logAudit({ action: "line.link", targetType: "guardian", targetId: guardian.id, detail: guardian.fullName });
    const childName = `${guardian.student.firstName} ${guardian.student.lastName}`;
    await replyText(replyToken, `ผูกบัญชีสำเร็จ ✅\nคุณจะได้รับแจ้งเตือนเมื่อ ${childName} เข้าโรงเรียน`);
    return;
  }

  const studentAccount = await repo.findStudentByLinkCode(code);
  if (!studentAccount || studentAccount.student.isDeleted) {
    const advisor = await repo.findAdvisorByLinkCode(code);
    if (advisor) {
      await repo.linkAdvisor(advisor.id, lineUserId);
      await logAudit({ action: "line.link", targetType: "staff", targetId: advisor.id, detail: "advisor LINE account" });
      await replyText(replyToken, `เชื่อม LINE ครูที่ปรึกษาสำเร็จ ✅\nคุณจะได้รับสรุปการเข้าโรงเรียนของห้องที่รับผิดชอบ`);
      return;
    }
    await replyText(replyToken, "ไม่พบรหัสผูกบัญชีนี้ กรุณาตรวจสอบรหัสกับทางโรงเรียนอีกครั้ง");
    return;
  }
  await repo.linkStudentAccount(studentAccount.id, lineUserId);
  await logAudit({ action: "line.link", targetType: "student", targetId: studentAccount.studentId, detail: "guardian LINE account" });
  const childName = `${studentAccount.student.firstName} ${studentAccount.student.lastName}`;
  await replyText(replyToken, `ผูกบัญชีสำเร็จ ✅\nคุณจะได้รับแจ้งเตือนเมื่อ ${childName} เข้าโรงเรียน`);
}

