import "server-only";

import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { replyLineMessage, replyText, sendLineTextToUsers } from "@/lib/line";
import { logAudit } from "@/lib/audit";

const HELP = "แจ้งลา: พิมพ์ ลา <รหัสนักเรียน> <ป่วย|กิจ> <วันเริ่ม> [ถึง <วันสุดท้าย>] <เหตุผล>\nตัวอย่าง: ลา 68-0421 ป่วย 14/11/2569 ถึง 15/11/2569 มีไข้";

function parseDate(value: string): Date | null {
  let year: number, month: number, day: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [year, month, day] = value.split("-").map(Number);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    [day, month, year] = value.split("/").map(Number);
    if (year >= 2400) year -= 543;
  } else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

function thaiDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(date);
}

async function linkedStudentHelp(lineUserId: string): Promise<string> {
  const students = await prisma.student.findMany({
    where: { isDeleted: false, OR: [
      { guardians: { some: { lineUserId, isDeleted: false } } },
      { lineAccounts: { some: { lineUserId } } },
    ] },
    select: { studentCode: true, firstName: true, lastName: true },
    take: 10,
  });
  return students.length ? `\nรหัสนักเรียนที่ผูกกับ LINE นี้: ${students.map((student) => `${student.studentCode} ${student.firstName}`).join(", ")}` : "\nบัญชี LINE นี้ยังไม่ผูกกับนักเรียน กรุณาขอรหัสผูกบัญชีจากโรงเรียนก่อน";
}

/** Returns true when the message was a leave command and has been handled. */
export async function handleLeaveLineMessage(lineUserId: string, text: string, replyToken: string, lineMessageId: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!/^ลา(?:\s|$)/u.test(trimmed)) return false;
  const match = /^ลา\s+(\S+)\s+(ป่วย|กิจ|ลาป่วย|ลากิจ)\s+(\S+)(?:\s+ถึง\s+(\S+))?\s+([\s\S]+)$/u.exec(trimmed);
  if (!match) { await replyText(replyToken, HELP + await linkedStudentHelp(lineUserId)); return true; }

  const [, studentCode, kindText, startText, endText, rawReason] = match;
  const kind = kindText.includes("ป่วย") ? "SICK" as const : "PERSONAL" as const;
  const startDate = parseDate(startText);
  const endDate = parseDate(endText ?? startText);
  const reason = rawReason.trim();
  if (!startDate || !endDate || startDate > endDate || endDate.getTime() - startDate.getTime() > 30 * 86_400_000 || reason.length < 3 || reason.length > 500) {
    await replyText(replyToken, `วันที่หรือเหตุผลไม่ถูกต้อง แจ้งลาได้ไม่เกิน 31 วันต่อครั้ง\n${HELP}`);
    return true;
  }

  const term = await prisma.term.findFirst({ where: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } }, select: { id: true, startDate: true, endDate: true } });
  if (!term || startDate.toISOString().slice(0, 10) < term.startDate.toISOString().slice(0, 10) || endDate.toISOString().slice(0, 10) > term.endDate.toISOString().slice(0, 10)) {
    await replyText(replyToken, "ช่วงวันที่ลาต้องอยู่ในภาคเรียนที่กำลังใช้งาน กรุณาตรวจสอบวันอีกครั้ง");
    return true;
  }

  const student = await prisma.student.findFirst({
    where: { studentCode, isDeleted: false, OR: [
      { guardians: { some: { lineUserId, isDeleted: false } } },
      { lineAccounts: { some: { lineUserId } } },
    ] },
    select: {
      id: true, studentCode: true, firstName: true, lastName: true,
      enrollments: { where: { termId: term.id, status: "ACTIVE", isDeleted: false }, take: 1, select: {
        classroomId: true, classroom: { select: { code: true, advisors: { select: { staff: { select: { lineUserId: true, isDeleted: true } } } } } },
      } },
    },
  });
  if (!student) { await replyText(replyToken, "รหัสนักเรียนไม่ตรงกับบัญชี LINE ที่ผูก หรือไม่ได้ลงทะเบียนในภาคเรียนนี้"); return true; }
  const enrollment = student.enrollments[0];
  if (!enrollment) { await replyText(replyToken, "นักเรียนยังไม่ได้ลงทะเบียนในภาคเรียนที่ใช้งาน"); return true; }

  const priorMessage = await prisma.leaveRequest.findUnique({ where: { lineMessageId }, select: { id: true } });
  if (priorMessage) { await replyText(replyToken, "ระบบได้รับคำขอลานี้แล้ว กรุณารอครูที่ปรึกษาตรวจสอบ"); await notifyAdvisorsOfLeaveRequest(priorMessage.id); return true; }
  const overlap = await prisma.leaveRequest.findFirst({ where: {
    studentId: student.id, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: endDate }, endDate: { gte: startDate },
  }, select: { id: true } });
  if (overlap) { await replyText(replyToken, "มีคำขอลาของนักเรียนคนนี้ในช่วงวันที่เลือกอยู่แล้ว กรุณาติดต่อครูที่ปรึกษา"); return true; }

  const advisorLineTargets = [...new Set(enrollment.classroom.advisors.flatMap((advisor) =>
    !advisor.staff.isDeleted && advisor.staff.lineUserId ? [advisor.staff.lineUserId] : []))];
  let request;
  try {
    request = await prisma.leaveRequest.create({ data: {
      studentId: student.id, termId: term.id, classroomId: enrollment.classroomId,
      parentLineUserId: lineUserId, lineMessageId, kind, startDate, endDate, reason,
      advisorLineTargets, advisorNotifyRetryKey: randomUUID(),
    } });
  } catch (error) {
    if (await prisma.leaveRequest.findUnique({ where: { lineMessageId }, select: { id: true } })) {
      await replyText(replyToken, "ระบบได้รับคำขอลานี้แล้ว กรุณารอครูที่ปรึกษาตรวจสอบ");
      const saved = await prisma.leaveRequest.findUnique({ where: { lineMessageId }, select: { id: true } });
      if (saved) await notifyAdvisorsOfLeaveRequest(saved.id);
      return true;
    }
    throw error;
  }
  await logAudit({ action: "leave.request.create", targetType: "leaveRequest", targetId: request.id, detail: `${student.studentCode ?? studentCode} · ${kind}` });
  await replyLineMessage(replyToken, { type: "text", text: `รับคำขอ${kind === "SICK" ? "ลาป่วย" : "ลากิจ"}ของ ${student.firstName} ${student.lastName} วันที่ ${thaiDate(startDate)}${startDate.getTime() === endDate.getTime() ? "" : ` ถึง ${thaiDate(endDate)}`} แล้ว\nสถานะ: รอครูที่ปรึกษาอนุมัติ`, quickReply: { items: [{ type: "action", action: { type: "postback", label: "ดูสถานะคำขอ", data: "leave|history", displayText: "ดูสถานะคำขอ" } }, { type: "action", action: { type: "postback", label: "แจ้งลาเพิ่ม", data: "leave|start", displayText: "แจ้งลาเพิ่ม" } }] } });
  await notifyAdvisorsOfLeaveRequest(request.id);
  return true;
}

export async function notifyAdvisorsOfLeaveRequest(id: string): Promise<{ accepted: boolean; code: string }> {
  const request = await prisma.leaveRequest.findUnique({ where: { id }, select: {
    id: true, classroomId: true, kind: true, startDate: true, endDate: true, reason: true,
    advisorLineTargets: true, advisorNotifyRetryKey: true, advisorNotifiedCount: true,
    student: { select: { firstName: true, lastName: true, studentCode: true } },
    classroom: { select: { code: true } },
  } });
  if (!request) return { accepted: false, code: "NOT_FOUND" };
  if (request.advisorNotifiedCount > 0) return { accepted: true, code: "ALREADY_ACCEPTED" };
  let targets = request.advisorLineTargets;
  let retryKey = request.advisorNotifyRetryKey;
  if (!targets.length) {
    const advisors = await prisma.classroomAdvisor.findMany({ where: { classroomId: request.classroomId,
      staff: { isDeleted: false, lineUserId: { not: null } } }, select: { staff: { select: { lineUserId: true } } } });
    targets = [...new Set(advisors.flatMap((advisor) => advisor.staff.lineUserId ? [advisor.staff.lineUserId] : []))];
    if (!targets.length) return { accepted: false, code: "NO_LINKED_ADVISOR" };
    retryKey = randomUUID();
    await prisma.leaveRequest.update({ where: { id }, data: { advisorLineTargets: targets, advisorNotifyRetryKey: retryKey } });
  }
  const text = `คำขอลาใหม่ · รออนุมัติ\n${request.student.studentCode} ${request.student.firstName} ${request.student.lastName} · ห้อง ${request.classroom.code}\n${request.kind === "SICK" ? "ลาป่วย" : "ลากิจ"} ${thaiDate(request.startDate)}${request.startDate.getTime() === request.endDate.getTime() ? "" : ` ถึง ${thaiDate(request.endDate)}`}\nเหตุผล: ${request.reason}\nตรวจคำขอ: https://chumkosoft.com/dashboard/leave-requests`;
  const result = await sendLineTextToUsers(targets, text, retryKey);
  if (result.accepted) await prisma.leaveRequest.update({ where: { id }, data: { advisorNotifiedCount: targets.length } });
  return result;
}
