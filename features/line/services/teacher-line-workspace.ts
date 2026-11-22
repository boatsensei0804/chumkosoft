import "server-only";

import { getDailyRollCallOverview } from "@/features/attendance/services/daily-roll-call-service";
import { leaveCard, leaveBubble } from "@/features/leave/leave-card";
import { requestTitle } from "@/features/leave/request-kind";
import { reviewLeaveRequest } from "@/features/leave/services/leave-review-service";
import type { LineFlexMessage } from "@/features/line/flex-types";
import { replyLineMessage } from "@/lib/line";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 5;
const safeId = /^[a-zA-Z0-9_-]{1,100}$/u;
const dateLabel = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "UTC" });
const rejectReasons = {
  details: "ข้อมูลในคำขอไม่ครบ กรุณาติดต่อครูที่ปรึกษา",
  schedule: "วันหรือเวลาไม่ตรงกับข้อมูลที่ตรวจสอบ กรุณาติดต่อครูที่ปรึกษา",
} as const;

function button(label: string, data: string) {
  return { type: "postback" as const, label, data: `teacher|${data}` };
}

function pendingScope(staffId: string) {
  return {
    status: "PENDING" as const,
    isDeleted: false,
    term: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } },
    classroom: { isDeleted: false, advisors: { some: { staffId } } },
  };
}

const requestDetails = {
  id: true, kind: true, reason: true, startDate: true, endDate: true, expectedArrivalTime: true,
  classroom: { select: { code: true } },
  student: { select: { firstName: true, lastName: true } },
} as const;

function formatRequest(request: {
  reason: string; startDate: Date; endDate: Date; expectedArrivalTime: string | null;
  classroom: { code: string }; student: { firstName: string; lastName: string };
}): string {
  const start = dateLabel.format(request.startDate);
  const date = request.startDate.getTime() === request.endDate.getTime() ? start : `${start} ถึง ${dateLabel.format(request.endDate)}`;
  return [
    `${request.student.firstName} ${request.student.lastName} · ห้อง ${request.classroom.code}`,
    date,
    request.expectedArrivalTime && `คาดว่าจะถึง ${request.expectedArrivalTime} น.`,
    `เหตุผลที่แจ้ง ${request.reason}`,
  ].filter(Boolean).join("\n");
}

async function pendingCards(staffId: string, after?: string): Promise<LineFlexMessage> {
  const requests = await prisma.leaveRequest.findMany({
    where: { ...pendingScope(staffId), ...(after ? { id: { gt: after } } : {}) },
    orderBy: { id: "asc" },
    select: requestDetails,
    take: PAGE_SIZE + 1,
  });
  const visible = requests.slice(0, PAGE_SIZE);
  if (!visible.length) {
    return leaveCard("คำขอรอตรวจ", after ? "ถึงท้ายรายการแล้ว" : "ไม่มีคำขอลาหรือขอมาสายที่รอตรวจในห้องที่คุณดูแล",
      after ? [button("กลับหน้าแรก", "pending")] : [], "brand", "empty");
  }

  const cards = visible.map((request) => leaveBubble(requestTitle(request.kind), formatRequest(request),
    [button("ตรวจคำขอนี้", `review|${request.id}`)], "brand", "pending"));
  if (requests.length > PAGE_SIZE || after) {
    const actions = requests.length > PAGE_SIZE ? [button("รายการถัดไป", `pending|${visible[visible.length - 1].id}`)] : [];
    if (after) actions.push(button("กลับหน้าแรก", "pending"));
    cards.push(leaveBubble("คำขอรอตรวจ", "รายการของห้องที่คุณเป็นครูที่ปรึกษา", actions));
  }
  return { type: "flex", altText: "คำขอลาและขอมาสายที่รอตรวจ", contents: { type: "carousel", contents: cards } };
}

async function todayCards(staffId: string, page: number): Promise<LineFlexMessage> {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const label = dateLabel.format(new Date(`${date}T00:00:00Z`));
  const rooms = await getDailyRollCallOverview(date, staffId) ?? [];
  const start = page * PAGE_SIZE;
  const visible = rooms.slice(start, start + PAGE_SIZE);
  if (!visible.length) {
    return leaveCard("สรุปวันนี้", rooms.length ? "ถึงท้ายรายการแล้ว" : "ยังไม่มีห้องที่ปรึกษาในภาคเรียนปัจจุบัน",
      page > 0 ? [button("กลับหน้าแรก", "summary")] : [], "brand", "empty");
  }

  const cards = visible.map((room) => leaveBubble(`ห้อง ${room.classroomCode}`, [
    label,
    `นักเรียนทั้งหมด ${room.total} คน`,
    `มาตรงเวลา ${room.present} · มาสาย ${room.late} · ขาดเรียน ${room.absent}`,
    `ลาป่วย ${room.sickLeave} · ลากิจ ${room.personalLeave}`,
    `ยังไม่เช็ก ${room.unchecked} คน`,
  ].join("\n"), [], "brand", "date"));
  if (start + PAGE_SIZE < rooms.length || page > 0) {
    const actions = start + PAGE_SIZE < rooms.length ? [button("ห้องถัดไป", `summary|${page + 1}`)] : [];
    if (page > 0) actions.push(button("กลับหน้าแรก", "summary"));
    cards.push(leaveBubble("สรุปวันนี้", `ห้องที่ปรึกษา ${rooms.length} ห้อง`, actions));
  }
  return { type: "flex", altText: "สรุปเช็กชื่อวันนี้ของห้องที่ปรึกษา", contents: { type: "carousel", contents: cards } };
}

export async function handleTeacherLinePostback(lineUserId: string, data: string, replyToken: string): Promise<boolean> {
  const [, action, target, reason, extra] = data.split("|");
  const reply = (card: LineFlexMessage) => replyLineMessage(replyToken, card);
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER", isActive: true, isDeleted: false, staff: { is: { lineUserId, isDeleted: false } } },
    select: { id: true, role: true, staffId: true },
    take: 2,
  });
  const teacher = teachers.length === 1 ? teachers[0] : null;
  if (!teacher?.staffId) {
    return reply(leaveCard("เมนูครู", "กรุณาผูกบัญชี LINE กับบัญชีครู 1 บัญชี หรือติดต่อผู้ดูแลระบบ", [], "brand", "empty"));
  }
  const staffId = teacher.staffId;

  if (action === "summary" && !reason && !extra && (target === undefined || /^\d{1,4}$/.test(target))) {
    return reply(await todayCards(staffId, Number(target ?? 0)));
  }
  if (action === "pending" && !reason && !extra && (target === undefined || safeId.test(target))) {
    return reply(await pendingCards(staffId, target));
  }

  const note = reason === "details" || reason === "schedule" ? rejectReasons[reason] : null;
  if (!target || !safeId.test(target) || extra !== undefined ||
      !((["review", "choose-approval", "choose-rejection", "approve"].includes(action) && reason === undefined) || (action === "reject" && note))) {
    return reply(leaveCard("เปิดรายการอีกครั้ง", "ปุ่มนี้ใช้งานไม่ได้ กรุณาเปิดรายการล่าสุดจากเมนูครู", [button("คำขอรอตรวจ", "pending")]));
  }

  const request = await prisma.leaveRequest.findFirst({ where: { ...pendingScope(staffId), id: target }, select: requestDetails });
  if (!request) {
    return reply(leaveCard("เปิดคำขอไม่ได้", "คำขอนี้ไม่อยู่ในรายการรอตรวจของคุณแล้ว", [button("คำขอรอตรวจ", "pending")], "brand", "empty"));
  }
  const title = requestTitle(request.kind);
  const detail = formatRequest(request);
  if (action === "review") {
    return reply(leaveCard(title, detail, [
      button("อนุมัติ", `choose-approval|${request.id}`), button("ไม่อนุมัติ", `choose-rejection|${request.id}`), button("กลับรายการ", "pending"),
    ], "brand", "review"));
  }
  if (action === "choose-approval") {
    return reply(leaveCard(`ยืนยันอนุมัติ${title}`, detail, [
      button("ยืนยันอนุมัติ", `approve|${request.id}`), button("ย้อนกลับ", `review|${request.id}`),
    ], "brand", "review"));
  }
  if (action === "choose-rejection") {
    return reply(leaveCard(`ไม่อนุมัติ${title}`, `${detail}\n\nเลือกเหตุผล ระบบจะบันทึกผลและแจ้งเหตุผลนี้ให้ผู้ปกครอง`, [
      button("ข้อมูลในคำขอไม่ครบ", `reject|${request.id}|details`),
      button("วันหรือเวลาไม่ตรงกัน", `reject|${request.id}|schedule`),
      button("ย้อนกลับ", `review|${request.id}`),
    ], "danger", "review"));
  }

  const result = await reviewLeaveRequest(request.id, action === "approve" ? "APPROVED" : "REJECTED", note ?? "", {
    id: teacher.id, role: teacher.role, staffId,
  });
  return reply(leaveCard(result.ok ? "บันทึกผลแล้ว" : "บันทึกผลไม่สำเร็จ", result.message,
    [button("ดูคำขอรอตรวจ", "pending")], result.ok ? "success" : "danger", result.ok ? "approved" : "rejected"));
}
