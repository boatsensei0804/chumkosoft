import "server-only";

import { lockLateBehaviorDay, refundApprovedLatePoints } from "@/features/behavior/services/late-points";
import { requestTitle, validArrivalTime } from "@/features/leave/request-kind";
import prisma from "@/lib/prisma";
import { leaveCard } from "@/features/leave/leave-card";
import { pushLineMessage } from "@/lib/line";
import { logAudit } from "@/lib/audit";
import { notifyAdvisorsOfLeaveRequest } from "@/features/leave/services/line-leave-service";
import type { CurrentUser } from "@/lib/dal";

function daysInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += 86_400_000) dates.push(new Date(time));
  return dates;
}

export async function reviewLeaveRequest(id: string, decision: "APPROVED" | "REJECTED", note: string, user: CurrentUser): Promise<{ ok: boolean; message: string }> {
  if (typeof id !== "string" || !id || typeof note !== "string" || note.length > 500 || (decision === "REJECTED" && note.trim().length < 3)) return { ok: false, message: "กรุณาระบุเหตุผลเมื่อไม่อนุมัติ และตรวจข้อมูลอีกครั้ง" };
  const request = await prisma.leaveRequest.findUnique({ where: { id }, include: { classroom: { select: { advisors: { select: { staffId: true } } } } } });
  if (!request || request.isDeleted) return { ok: false, message: "ไม่พบคำขอลา" };
  if (user.role !== "ADMIN" && !request.classroom.advisors.some((advisor) => advisor.staffId === user.staffId)) {
    return { ok: false, message: "คุณไม่มีสิทธิ์พิจารณาคำขอลาห้องนี้" };
  }
  if (request.status !== "PENDING") return { ok: false, message: "คำขอนี้ถูกพิจารณาแล้ว กรุณาโหลดหน้าใหม่" };
  const dates = daysInRange(request.startDate, request.endDate);
  if (dates.length < 1 || dates.length > 31) return { ok: false, message: "ช่วงวันที่ลาไม่ถูกต้อง" };
  if (request.kind === "LATE" && (dates.length !== 1 || !validArrivalTime(request.expectedArrivalTime ?? ""))) return { ok: false, message: "ข้อมูลวันที่หรือเวลาขอมาสายไม่ถูกต้อง" };
  const result = await prisma.$transaction(async (tx) => {
    if (request.kind === "LATE" && decision === "APPROVED") await lockLateBehaviorDay(tx, request.termId, request.studentId, request.startDate);
    if (decision === "APPROVED" && request.kind !== "LATE") {
      const [entries, rollCalls] = await Promise.all([
        tx.schoolEntry.findMany({ where: { studentId: request.studentId, date: { gte: request.startDate, lte: request.endDate }, checkInAt: { not: null }, isDeleted: false }, select: { date: true } }),
        tx.dailyAttendance.findMany({ where: { studentId: request.studentId, termId: request.termId, date: { gte: request.startDate, lte: request.endDate }, status: { in: ["PRESENT", "LATE"] }, isDeleted: false }, select: { date: true } }),
      ]);
      if (entries.length || rollCalls.length) return { ok: false, message: "มีวันที่นักเรียนมาเรียนหรือเช็คชื่อแล้ว กรุณาตรวจข้อมูลก่อนอนุมัติ" };
    }
    const changed = await tx.leaveRequest.updateMany({ where: { id, status: "PENDING", isDeleted: false }, data: {
      status: decision, reviewNote: note.trim() || null, reviewedByUserId: user.id, reviewedAt: new Date(),
    } });
    if (!changed.count) return { ok: false, message: "คำขอนี้ถูกพิจารณาแล้ว กรุณาโหลดหน้าใหม่" };
    if (decision === "APPROVED" && request.kind !== "LATE") {
      for (const date of dates) {
        await tx.dailyAttendance.upsert({
          where: { termId_studentId_date: { termId: request.termId, studentId: request.studentId, date } },
          create: { termId: request.termId, studentId: request.studentId, classroomId: request.classroomId, date,
            status: request.kind === "SICK" ? "SICK_LEAVE" : "PERSONAL_LEAVE", note: request.reason, recordedById: user.staffId },
          update: { status: request.kind === "SICK" ? "SICK_LEAVE" : "PERSONAL_LEAVE", note: request.reason,
            recordedById: user.staffId, isDeleted: false, deletedAt: null },
        });
      }
    }
    if (decision === "APPROVED" && request.kind === "LATE") await refundApprovedLatePoints(tx, request.termId, request.studentId, request.startDate, user.id);
    return { ok: true, message: decision === "APPROVED" ? request.kind === "LATE" ? "อนุมัติขอมาสายและยกเว้นการหัก 10 คะแนนในวันที่ขอแล้ว" : "อนุมัติและบันทึกสถานะลาแล้ว" : "ไม่อนุมัติคำขอแล้ว" };
  });
  if (!result.ok) return result;
  await logAudit({ actorId: user.id, action: decision === "APPROVED" ? "leave.request.approve" : "leave.request.reject", targetType: "leaveRequest", targetId: id });
  const student = await prisma.student.findUnique({ where: { id: request.studentId }, select: { firstName: true, lastName: true } });
  const statusText = decision === "APPROVED" ? "อนุมัติแล้ว" : "ไม่อนุมัติ";
  const dateLabel = (date: Date) => new Intl.DateTimeFormat("th-TH", { timeZone: "UTC", dateStyle: "medium" }).format(date);
  const reply = `${requestTitle(request.kind)} ${student?.firstName ?? "นักเรียน"} ${student?.lastName ?? ""}: ${statusText}\n${dateLabel(request.startDate)}${request.startDate.getTime() === request.endDate.getTime() ? "" : ` ถึง ${dateLabel(request.endDate)}`}${request.kind === "LATE" ? `\nคาดว่าจะถึง ${request.expectedArrivalTime} น.${decision === "APPROVED" ? "\nยกเว้นการหักคะแนนมาสายเฉพาะวันที่ขอ เวลามาถึงจริงยังบันทึกตามการสแกน" : ""}` : ""}${note.trim() ? `\nหมายเหตุ: ${note.trim()}` : ""}`;
  const sent = await pushLineMessage(request.parentLineUserId, leaveCard(statusText, reply, [{ type: "postback", label: "ดูคำขอล่าสุด", data: "leave|history", displayText: "ดูคำขอล่าสุด" }], decision === "APPROVED" ? "success" : "danger", decision === "APPROVED" ? "approved" : "rejected"));
  return sent ? result : { ...result, message: `${result.message} แต่แจ้งผู้ปกครองทาง LINE ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ` };
}

export async function retryLeaveAdvisorNotification(id: string, user: CurrentUser): Promise<{ ok: boolean; message: string }> {
  if (user.role !== "ADMIN") return { ok: false, message: "เฉพาะแอดมินเท่านั้นที่ส่งแจ้งเตือนซ้ำได้" };
  const request = await prisma.leaveRequest.findUnique({ where: { id }, select: { status: true, isDeleted: true } });
  if (!request || request.isDeleted || request.status !== "PENDING") return { ok: false, message: "ส่งซ้ำได้เฉพาะคำขอที่รอพิจารณา" };
  const result = await notifyAdvisorsOfLeaveRequest(id);
  return { ok: result.accepted, message: result.accepted ? "LINE รับคำขอแจ้งครูที่ปรึกษาแล้ว" : result.code === "NO_LINKED_ADVISOR" ? "ครูที่ปรึกษายังไม่เชื่อม LINE" : "แจ้งครูผ่าน LINE ไม่สำเร็จ กรุณาตรวจการตั้งค่าและลองอีกครั้ง" };
}

/** Hides requests without reversing attendance or an approved late exemption. */
export async function deleteLeaveRequest(id: string, user: CurrentUser): Promise<{ ok: boolean; message: string }> {
  if (user.role !== "ADMIN") return { ok: false, message: "เฉพาะแอดมินเท่านั้นที่ลบคำขอได้" };
  if (typeof id !== "string" || !id || id.length > 150) return { ok: false, message: "คำขอไม่ถูกต้อง" };
  const changed = await prisma.$transaction(async tx => {
    const result = await tx.leaveRequest.updateMany({ where: { id, isDeleted: false }, data: { isDeleted: true, deletedAt: new Date(), deletedByUserId: user.id } });
    if (result.count) await tx.auditLog.create({ data: { actorId: user.id, action: "leave.request.delete", targetType: "leaveRequest", targetId: id, detail: "นำออกจากรายการและรายงาน โดยคงผลเช็กชื่อและคะแนนเดิม" } });
    return result.count;
  });
  return changed ? { ok: true, message: "ลบคำขอจากรายการและสรุปแล้ว ผลเช็กชื่อและคะแนนเดิมยังคงอยู่" } : { ok: false, message: "ไม่พบคำขอ หรือคำขอนี้ถูกลบแล้ว" };
}
