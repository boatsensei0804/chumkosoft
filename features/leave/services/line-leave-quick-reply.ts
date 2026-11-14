import "server-only";

import prisma from "@/lib/prisma";
import { replyLineMessage, replyText, type LineQuickReplyAction } from "@/lib/line";
import { handleLeaveLineMessage } from "@/features/leave/services/line-leave-service";

type Kind = "SICK" | "PERSONAL";
type Button = { type: "action"; action: LineQuickReplyAction };
const PAGE_SIZE = 10;
const REASONS: Record<Kind, { code: string; label: string; text: string }[]> = {
  SICK: [
    { code: "fever", label: "มีไข้", text: "มีไข้ ไม่สบาย" },
    { code: "doctor", label: "พบแพทย์", text: "ไปพบแพทย์" },
    { code: "rest", label: "พักรักษาตัว", text: "พักรักษาตัว" },
  ],
  PERSONAL: [
    { code: "family", label: "ธุระครอบครัว", text: "มีธุระครอบครัว" },
    { code: "appointment", label: "นัดหมาย", text: "มีนัดหมายจำเป็น" },
    { code: "personal", label: "ธุระส่วนตัว", text: "มีธุระส่วนตัว" },
  ],
};

function button(label: string, data: string): Button {
  return { type: "action", action: { type: "postback", label, data, displayText: label } };
}

function dateButton(label: string, data: string, min: string, max: string, initial: string): Button {
  return { type: "action", action: { type: "datetimepicker", label, data, mode: "date", min, max, initial } };
}

async function choices(replyToken: string, message: string, items: Button[]): Promise<boolean> {
  return replyLineMessage(replyToken, { type: "text", text: message, quickReply: { items } });
}

function iso(date: Date): string { return date.toISOString().slice(0, 10); }

function parseIso(text: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && iso(date) === text ? date : null;
}

function thai(date: string): string {
  return new Intl.DateTimeFormat("th-TH", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(`${date}T00:00:00Z`));
}

async function activeTerm() {
  return prisma.term.findFirst({ where: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } }, select: { id: true, startDate: true, endDate: true } });
}

async function linkedStudents(lineUserId: string, termId: string) {
  return prisma.student.findMany({
    where: { isDeleted: false, enrollments: { some: { termId, status: "ACTIVE", isDeleted: false } }, OR: [
      { guardians: { some: { lineUserId, isDeleted: false } } },
      { lineAccounts: { some: { lineUserId } } },
    ] },
    select: { id: true, studentCode: true, firstName: true, lastName: true },
    orderBy: { studentCode: "asc" },
  });
}

async function studentForUser(lineUserId: string, studentId: string) {
  const term = await activeTerm();
  if (!term) return null;
  const student = await prisma.student.findFirst({ where: {
    id: studentId, isDeleted: false, enrollments: { some: { termId: term.id, status: "ACTIVE", isDeleted: false } },
    OR: [{ guardians: { some: { lineUserId, isDeleted: false } } }, { lineAccounts: { some: { lineUserId } } }],
  }, select: { id: true, studentCode: true, firstName: true, lastName: true } });
  return student ? { student, term } : null;
}

async function chooseKind(replyToken: string, student: { id: string; firstName: string; lastName: string }): Promise<boolean> {
  return choices(replyToken, `แจ้งลาของ ${student.firstName} ${student.lastName}\n1/4 เลือกประเภทการลา`, [
    button("ลาป่วย", `leave|kind|${student.id}|SICK`), button("ลากิจ", `leave|kind|${student.id}|PERSONAL`),
    button("เปลี่ยนนักเรียน", "leave|start"), button("ดูคำขอล่าสุด", "leave|history"), button("ยกเลิก", "leave|cancel"),
  ]);
}

export async function showLineLeaveHistory(lineUserId: string, replyToken: string): Promise<boolean> {
  const rows = await prisma.leaveRequest.findMany({
    where: { parentLineUserId: lineUserId, student: { isDeleted: false, OR: [
      { guardians: { some: { lineUserId, isDeleted: false } } }, { lineAccounts: { some: { lineUserId } } },
    ] } },
    select: { kind: true, startDate: true, endDate: true, status: true, reviewNote: true, student: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" }, take: 5,
  });
  const labels = { PENDING: "รอครูอนุมัติ", APPROVED: "อนุมัติแล้ว", REJECTED: "ไม่อนุมัติ" };
  const text = rows.length ? "คำขอล่าสุดที่คุณส่ง (ไม่เกิน 5 รายการ)\n\n" + rows.map((row, index) => `${index + 1}. ${row.student.firstName} ${row.student.lastName}\n${row.kind === "SICK" ? "ลาป่วย" : "ลากิจ"} ${thai(iso(row.startDate))}${iso(row.startDate) === iso(row.endDate) ? "" : ` ถึง ${thai(iso(row.endDate))}`}\nสถานะ: ${labels[row.status]}${row.reviewNote ? `\nหมายเหตุ: ${row.reviewNote.slice(0, 200)}` : ""}`).join("\n\n") : "ยังไม่มีคำขอลาที่คุณส่งสำหรับนักเรียนที่ผูกกับ LINE นี้";
  return choices(replyToken, text, [button("แจ้งลาใหม่", "leave|start")]);
}

export async function startLineLeaveChoices(lineUserId: string, replyToken: string, page = 0): Promise<boolean> {
  const term = await activeTerm();
  if (!term) return replyText(replyToken, "ยังไม่มีภาคเรียนที่ใช้งาน กรุณาติดต่อโรงเรียน");
  const students = await linkedStudents(lineUserId, term.id);
  if (!students.length) return replyText(replyToken, "LINE นี้ยังไม่ผูกกับนักเรียนในภาคเรียนปัจจุบัน กรุณาขอรหัสเชื่อมบัญชีจากโรงเรียนก่อน");
  const lastPage = Math.max(0, Math.ceil(students.length / PAGE_SIZE) - 1);
  const current = Math.max(0, Math.min(lastPage, page));
  const items = students.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((s) => button(`${s.firstName} ${s.studentCode}`.slice(0, 20), `leave|student|${s.id}`));
  if (current > 0) items.push(button("ก่อนหน้า", `leave|page|${current - 1}`));
  if (current < lastPage) items.push(button("ถัดไป", `leave|page|${current + 1}`));
  items.push(button("ดูคำขอล่าสุด", "leave|history"));
  return choices(replyToken, `เลือกนักเรียนที่ต้องการแจ้งลา (${students.length} คน)\nหน้า ${current + 1}/${lastPage + 1}\n\n${students.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((student) => `${student.firstName} ${student.lastName} · รหัส ${student.studentCode}`).join("\n")}\n\nเลือกแจ้งลาทีละคน หากลูกหลายคนลาพร้อมกัน ให้ส่งแยกคนละคำขอ`, items);
}

async function reasons(replyToken: string, studentId: string, kind: Kind, start: string, end: string): Promise<boolean> {
  const items = REASONS[kind].map((reason) => button(reason.label, `leave|reason|${studentId}|${kind}|${start}|${end}|${reason.code}`));
  items.push(button("เปลี่ยน/เพิ่มวันลา", `leave|date|${studentId}|${kind}|${start}`));
  items.push(button("เปลี่ยนประเภทลา", `leave|student|${studentId}`));
  items.push(button("ยกเลิก", "leave|cancel"));
  return choices(replyToken, `3/4 เลือกเหตุผล${kind === "SICK" ? "ลาป่วย" : "ลากิจ"} วันที่ ${thai(start)}${start === end ? "" : ` ถึง ${thai(end)}`}`, items);
}

/** The rich-menu button may send the text "แจ้งลา" or postback data "leave|start". */
export async function handleLeavePostback(lineUserId: string, data: string, date: string | undefined, replyToken: string, eventId: string): Promise<boolean> {
  if (!data.startsWith("leave|")) return false;
  const parts = data.split("|");
  const step = parts[1];
  if (step === "history") { await showLineLeaveHistory(lineUserId, replyToken); return true; }
  if (step === "start") { await startLineLeaveChoices(lineUserId, replyToken); return true; }
  if (step === "page") { await startLineLeaveChoices(lineUserId, replyToken, Number(parts[2]) || 0); return true; }
  if (step === "cancel") { await replyText(replyToken, "ยกเลิกการแจ้งลาแล้ว"); return true; }

  const studentId = parts[2];
  const context = studentId ? await studentForUser(lineUserId, studentId) : null;
  if (!context) { await replyText(replyToken, "ไม่พบสิทธิ์แจ้งลาของนักเรียนนี้ กรุณากดเมนูแจ้งลาเพื่อเริ่มใหม่"); return true; }
  const { student, term } = context;
  if (step === "student") { await chooseKind(replyToken, student); return true; }
  const kind = parts[3];
  if (kind !== "SICK" && kind !== "PERSONAL") { await replyText(replyToken, "ข้อมูลคำขอไม่ถูกต้อง กรุณากดแจ้งลาอีกครั้ง"); return true; }
  const min = iso(term.startDate);
  const max = iso(term.endDate);
  if (step === "kind") {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const initial = today < min ? min : today > max ? max : today;
    const tomorrow = iso(new Date(new Date(`${today}T00:00:00Z`).getTime() + 86_400_000));
    const items: Button[] = [];
    if (today >= min && today <= max) items.push(button("ลาวันนี้", `leave|quick|${student.id}|${kind}|${today}`));
    if (tomorrow >= min && tomorrow <= max) items.push(button("ลาพรุ่งนี้", `leave|quick|${student.id}|${kind}|${tomorrow}`));
    items.push(dateButton("เลือกวันอื่น/หลายวัน", `leave|date|${student.id}|${kind}`, min, max, initial));
    items.push(button("ย้อนกลับ", `leave|student|${student.id}`), button("ยกเลิก", "leave|cancel"));
    await choices(replyToken, `2/4 เลือกวัน${kind === "SICK" ? "ลาป่วย" : "ลากิจ"}ของ ${student.firstName}\nวันนี้/พรุ่งนี้เป็นการลา 1 วัน สามารถแก้ช่วงวันก่อนส่งได้`, items);
    return true;
  }
  const start = step === "date" ? date ?? parts[4] : parts[4];
  if (!start || !parseIso(start) || start < min || start > max) { await replyText(replyToken, "วันที่ไม่อยู่ในภาคเรียน กรุณากดแจ้งลาใหม่อีกครั้ง"); return true; }
  if (step === "date") {
    await choices(replyToken, `เริ่มลา ${thai(start)}\nต้องการลากี่วัน?`, [
      button("วันเดียว", `leave|one|${student.id}|${kind}|${start}`),
      button("หลายวัน", `leave|range|${student.id}|${kind}|${start}`),
      button("เปลี่ยนวันเริ่ม", `leave|kind|${student.id}|${kind}`), button("ยกเลิก", "leave|cancel"),
    ]); return true;
  }
  if (step === "quick") { await reasons(replyToken, student.id, kind, start, start); return true; }
  if (step === "one") { await reasons(replyToken, student.id, kind, start, start); return true; }
  if (step === "range") {
    const endLimit = iso(new Date(Math.min(term.endDate.getTime(), parseIso(start)!.getTime() + 30 * 86_400_000)));
    await choices(replyToken, `เริ่มลา ${thai(start)}\nเลือกวันสุดท้าย (ไม่เกิน 31 วัน)`, [dateButton("เลือกวันสุดท้าย", `leave|end|${student.id}|${kind}|${start}`, start, endLimit, start), button("ย้อนกลับ", `leave|date|${student.id}|${kind}|${start}`), button("ยกเลิก", "leave|cancel")]);
    return true;
  }
  const end = step === "end" ? date : parts[5];
  if (!end || !parseIso(end) || end < start || end > max || parseIso(end)!.getTime() - parseIso(start)!.getTime() > 30 * 86_400_000) {
    await replyText(replyToken, "ช่วงวันที่ลาไม่ถูกต้อง กรุณากดแจ้งลาใหม่อีกครั้ง"); return true;
  }
  if (step === "end" || step === "reasons") { await reasons(replyToken, student.id, kind, start, end); return true; }
  const reason = REASONS[kind].find((item) => item.code === parts[6]);
  if (!reason) { await replyText(replyToken, "เหตุผลไม่ถูกต้อง กรุณากดแจ้งลาใหม่อีกครั้ง"); return true; }
  if (step === "reason") {
    await choices(replyToken, `4/4 ตรวจสอบก่อนส่งคำขอ${kind === "SICK" ? "ลาป่วย" : "ลากิจ"}\n${student.firstName} ${student.lastName}\n${thai(start)}${start === end ? "" : ` ถึง ${thai(end)}`}\nเหตุผล: ${reason.text}\nครูที่ปรึกษาจะตรวจคำขอก่อนบันทึกการลา`, [
      button("ยืนยันส่งคำขอ", `leave|confirm|${student.id}|${kind}|${start}|${end}|${reason.code}`),
      button("แก้เหตุผล", `leave|reasons|${student.id}|${kind}|${start}|${end}`),
      button("แก้วันที่", `leave|kind|${student.id}|${kind}`), button("เปลี่ยนนักเรียน", "leave|start"), button("ยกเลิก", "leave|cancel"),
    ]); return true;
  }
  if (step === "confirm") {
    const typed = `ลา ${student.studentCode} ${kind === "SICK" ? "ป่วย" : "กิจ"} ${start}${start === end ? "" : ` ถึง ${end}`} ${reason.text}`;
    await handleLeaveLineMessage(lineUserId, typed, replyToken, eventId);
    return true;
  }
  await replyText(replyToken, "ไม่พบขั้นตอนนี้ กรุณากดแจ้งลาใหม่อีกครั้ง");
  return true;
}
