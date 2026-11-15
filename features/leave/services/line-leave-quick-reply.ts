import "server-only";

import { leaveCard, leaveBubble, type LeaveCardState } from "@/features/leave/leave-card";
import { requestKindLabel, validArrivalTime, type AttendanceRequestKind } from "@/features/leave/request-kind";
import prisma from "@/lib/prisma";
import { replyLineMessage, replyText, type LineQuickReplyAction } from "@/lib/line";
import { handleLeaveLineMessage } from "@/features/leave/services/line-leave-service";

type Kind = AttendanceRequestKind;
type Button = { type: "action"; action: LineQuickReplyAction };
const PAGE_SIZE = 10;
const REASONS: Record<Kind, { code: string; label: string; text: string }[]> = {
  SICK: [
    { code: "fever", label: "มีไข้", text: "มีไข้ ไม่สบาย" },
    { code: "doctor", label: "พบแพทย์", text: "ไปพบแพทย์" },
    { code: "rest", label: "พักรักษาตัว", text: "พักรักษาตัว" },
  ],
  LATE: [
    { code: "traffic", label: "รถติด/เดินทางล่าช้า", text: "การเดินทางล่าช้า" },
    { code: "doctor", label: "พบแพทย์ก่อนมาเรียน", text: "ไปพบแพทย์ก่อนเข้าเรียน" },
    { code: "family", label: "ธุระครอบครัว", text: "มีธุระครอบครัวก่อนเข้าเรียน" },
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
  if (min === max) return button(label, `${data}|${min}`);
  return { type: "action", action: { type: "datetimepicker", label, data, mode: "date", min, max, initial } };
}

async function choices(replyToken: string, message: string, items: Button[], state: LeaveCardState = "menu"): Promise<boolean> {
  const [title, ...lines] = message.split("\n");
  return replyLineMessage(replyToken, leaveCard(title, lines.join("\n") || "เลือกจากปุ่มด้านล่าง", items.map((item) => item.action), "brand", state));
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
    select: { id: true, studentCode: true, firstName: true, lastName: true, enrollments: { where: { termId, status: "ACTIVE", isDeleted: false }, select: { classroom: { select: { code: true } } } } },
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
  return choices(replyToken, `คำขอสำหรับ ${student.firstName} ${student.lastName}\nเลือกประเภทคำขอ`, [
    button("ลาป่วย", `leave|kind|${student.id}|SICK`), button("ลากิจ", `leave|kind|${student.id}|PERSONAL`), button("ขอมาสาย", `leave|kind|${student.id}|LATE`),
    button("เปลี่ยนนักเรียน", "leave|start"), button("ดูคำขอล่าสุด", "leave|history"), button("ยกเลิก", "leave|cancel"),
  ], "kind");
}

export async function showLineLeaveHistory(lineUserId: string, replyToken: string): Promise<boolean> {
  const rows = await prisma.leaveRequest.findMany({
    where: { isDeleted: false, parentLineUserId: lineUserId, student: { isDeleted: false, OR: [
      { guardians: { some: { lineUserId, isDeleted: false } } }, { lineAccounts: { some: { lineUserId } } },
    ] } },
    select: { kind: true, expectedArrivalTime: true, startDate: true, endDate: true, status: true, reviewNote: true, student: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" }, take: 5,
  });
  const labels = { PENDING: "รอครูอนุมัติ", APPROVED: "อนุมัติแล้ว", REJECTED: "ไม่อนุมัติ" };
  if (!rows.length) return choices(replyToken, "คำขอลาของคุณ\nยังไม่มีคำขอลาที่คุณส่งสำหรับนักเรียนที่ผูกกับ LINE นี้", [button("แจ้งลาใหม่", "leave|start")], "empty");
  return replyLineMessage(replyToken, { type: "flex", altText: "สถานะคำขอล่าสุดของคุณ · รออนุมัติ/ผลพิจารณาจากครู", contents: { type: "carousel", contents: rows.map((row) => leaveBubble(labels[row.status], `${row.student.firstName} ${row.student.lastName}\n${requestKindLabel(row.kind)} ${thai(iso(row.startDate))}${iso(row.startDate) === iso(row.endDate) ? "" : ` ถึง ${thai(iso(row.endDate))}`}${row.expectedArrivalTime ? `\nคาดว่าจะถึง ${row.expectedArrivalTime} น.` : ""}${row.kind === "LATE" && row.status === "APPROVED" ? "\nยกเว้นหัก 10 คะแนนเฉพาะวันที่ขอ" : ""}${row.reviewNote ? `\nหมายเหตุ: ${row.reviewNote}` : ""}`, [button("แจ้งลาใหม่", "leave|start").action], row.status === "APPROVED" ? "success" : row.status === "REJECTED" ? "danger" : "brand", row.status === "APPROVED" ? "approved" : row.status === "REJECTED" ? "rejected" : "pending")) } });
}

export async function startLineLeaveChoices(lineUserId: string, replyToken: string, page = 0): Promise<boolean> {
  const term = await activeTerm();
  if (!term) return replyText(replyToken, "ยังไม่มีภาคเรียนที่ใช้งาน กรุณาติดต่อโรงเรียน");
  const students = await linkedStudents(lineUserId, term.id);
  if (!students.length) return replyText(replyToken, "LINE นี้ยังไม่ผูกกับนักเรียนในภาคเรียนปัจจุบัน กรุณาขอรหัสเชื่อมบัญชีจากโรงเรียนก่อน");
  const lastPage = Math.max(0, Math.ceil(students.length / PAGE_SIZE) - 1);
  const current = Math.max(0, Math.min(lastPage, page));
  const pageStudents = students.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const bubbles = pageStudents.map((student) => leaveBubble("เลือกนักเรียน", `${student.firstName} ${student.lastName}\nรหัส ${student.studentCode}\nห้อง ${student.enrollments?.[0]?.classroom.code ?? "—"}\n\nตรวจชื่อให้ตรงกับลูกที่ต้องการแจ้งลา`, [button("เลือกนักเรียนคนนี้", `leave|student|${student.id}`).action], "brand", "student"));
  const navigation: Button[] = [];
  if (current > 0) navigation.push(button("ก่อนหน้า", `leave|page|${current - 1}`));
  if (current < lastPage) navigation.push(button("ถัดไป", `leave|page|${current + 1}`));
  navigation.push(button("ดูคำขอล่าสุด", "leave|history"));
  bubbles.push(leaveBubble("เมนูแจ้งลา / มาสาย", `ผูกนักเรียนไว้ ${students.length} คน · หน้า ${current + 1}/${lastPage + 1}\nเลื่อนการ์ดเพื่อเลือกลูกทีละคน หากลาหลายคนให้ส่งแยกคำขอ`, navigation.map((item) => item.action)));
  return replyLineMessage(replyToken, { type: "flex", altText: "เลือกนักเรียนที่ต้องการแจ้งลา · ตรวจชื่อและรหัสก่อนเลือก", contents: { type: "carousel", contents: bubbles } });
}

async function reasons(replyToken: string, studentId: string, kind: Kind, start: string, end: string, expectedArrivalTime?: string): Promise<boolean> {
  const items = REASONS[kind].map((reason) => button(reason.label, `leave|reason|${studentId}|${kind}|${start}|${expectedArrivalTime ?? end}|${reason.code}`));
  items.push(kind === "LATE" ? button("เปลี่ยนวัน/เวลา", `leave|kind|${studentId}|LATE`) : button("เปลี่ยน/เพิ่มวันลา", `leave|date|${studentId}|${kind}|${start}`));
  items.push(button("เปลี่ยนประเภทลา", `leave|student|${studentId}`));
  items.push(button("ยกเลิก", "leave|cancel"));
  return choices(replyToken, `${kind === "LATE" ? "4/5" : "3/4"} เลือกเหตุผล${requestKindLabel(kind)} วันที่ ${thai(start)}${start === end ? "" : ` ถึง ${thai(end)}`}${expectedArrivalTime ? ` คาดว่าจะถึง ${expectedArrivalTime} น.` : ""}`, items, "reason");
}

/** The rich-menu button may send the text "แจ้งลา" or postback data "leave|start". */
export async function handleLeavePostback(lineUserId: string, data: string, date: string | undefined, replyToken: string, eventId: string, selectedTime?: string): Promise<boolean> {
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
  if (kind !== "SICK" && kind !== "PERSONAL" && kind !== "LATE") { await replyText(replyToken, "ข้อมูลคำขอไม่ถูกต้อง กรุณากดแจ้งลาอีกครั้ง"); return true; }
  const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const min = kind === "LATE" && todayLocal > iso(term.startDate) ? todayLocal : iso(term.startDate);
  const max = iso(term.endDate);
  if (kind === "LATE" && min > max) { await replyText(replyToken, "ไม่มีวันในภาคเรียนนี้สำหรับขอมาสายล่วงหน้า"); return true; }
  if (step === "kind") {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const initial = today < min ? min : today > max ? max : today;
    const tomorrow = iso(new Date(new Date(`${today}T00:00:00Z`).getTime() + 86_400_000));
    const items: Button[] = [];
    if (today >= min && today <= max) items.push(button(kind === "LATE" ? "มาสายวันนี้" : "ลาวันนี้", `leave|quick|${student.id}|${kind}|${today}`));
    if (tomorrow >= min && tomorrow <= max) items.push(button(kind === "LATE" ? "มาสายพรุ่งนี้" : "ลาพรุ่งนี้", `leave|quick|${student.id}|${kind}|${tomorrow}`));
    items.push(dateButton(kind === "LATE" ? "เลือกวันอื่น" : "เลือกวันอื่น/หลายวัน", `leave|date|${student.id}|${kind}`, min, max, initial));
    items.push(button("ย้อนกลับ", `leave|student|${student.id}`), button("ยกเลิก", "leave|cancel"));
    await choices(replyToken, `${kind === "LATE" ? "2/5" : "2/4"} เลือกวัน${requestKindLabel(kind)}ของ ${student.firstName}\n${kind === "LATE" ? "แจ้งล่วงหน้าได้ครั้งละ 1 วัน ขั้นถัดไปเลือกเวลาที่คาดว่าจะถึง" : "วันนี้/พรุ่งนี้เป็นการลา 1 วัน สามารถแก้ช่วงวันก่อนส่งได้"}`, items, "date");
    return true;
  }
  const start = step === "date" ? date ?? parts[4] : parts[4];
  if (!start || !parseIso(start) || start < min || start > max) { await replyText(replyToken, "วันที่ไม่อยู่ในภาคเรียน กรุณากดแจ้งลาใหม่อีกครั้ง"); return true; }
  if (kind === "LATE") {
    if (step === "quick" || step === "date") {
      const partsNow = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).split(":").map(Number);
      const minutes = start === todayLocal ? Math.min(partsNow[0] * 60 + partsNow[1] + 30, 1439) : 540;
      const initial = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      await choices(replyToken, `3/5 เลือกเวลาที่คาดว่าจะถึง\n${student.firstName} ${student.lastName} · ${thai(start)}\nเวลาไทย · ครูต้องอนุมัติก่อนจึงจะยกเว้นหักคะแนน`, [
        { type: "action", action: { type: "datetimepicker", label: "เลือกเวลาถึงโรงเรียน", data: `leave|time|${student.id}|LATE|${start}`, mode: "time", initial } },
        button("เปลี่ยนวันที่", `leave|kind|${student.id}|LATE`), button("ยกเลิก", "leave|cancel"),
      ], "date"); return true;
    }
    const arrival = step === "time" ? selectedTime : parts[5];
    if (!arrival || !validArrivalTime(arrival)) { await replyText(replyToken, "เวลาไม่ถูกต้อง กรุณากดขอมาสายและเลือกเวลาใหม่"); return true; }
    if (step !== "confirm" && new Date(`${start}T${arrival}:00+07:00`).getTime() <= Date.now()) { await replyText(replyToken, "กรุณาเลือกเวลาถึงที่ยังมาไม่ถึง เพื่อแจ้งขอมาสายล่วงหน้า"); return true; }
    if (step === "time" || step === "reasons") { await reasons(replyToken, student.id, "LATE", start, start, arrival); return true; }
    const reason = REASONS.LATE.find((item) => item.code === parts[6]);
    if (!reason) { await replyText(replyToken, "กรุณาเลือกเหตุผลขอมาสายใหม่"); return true; }
    if (step === "reason") {
      await choices(replyToken, `5/5 ตรวจสอบคำขอมาสาย\n${student.firstName} ${student.lastName} · รหัส ${student.studentCode}\n${thai(start)} · คาดว่าจะถึง ${arrival} น.\nเหตุผล: ${reason.text}\nเมื่อครูอนุมัติ จะยกเว้นหัก 10 คะแนนเฉพาะวันที่ขอ และยังบันทึกเวลาเข้าโรงเรียนตามจริง`, [
        button("ยืนยันส่งคำขอ", `leave|confirm|${student.id}|LATE|${start}|${arrival}|${reason.code}`),
        button("แก้เหตุผล", `leave|reasons|${student.id}|LATE|${start}|${arrival}`), button("แก้วัน/เวลา", `leave|kind|${student.id}|LATE`), button("เปลี่ยนนักเรียน", "leave|start"), button("ยกเลิก", "leave|cancel"),
      ], "review"); return true;
    }
    if (step === "confirm") { await handleLeaveLineMessage(lineUserId, `ขอมาสาย ${student.studentCode} ${start} ${arrival} ${reason.text}`, replyToken, eventId); return true; }
    await replyText(replyToken, "ขั้นตอนขอมาสายไม่ถูกต้อง กรุณาเริ่มใหม่"); return true;
  }
  if (step === "date") {
    await choices(replyToken, `เริ่มลา ${thai(start)}\nต้องการลากี่วัน?`, [
      button("วันเดียว", `leave|one|${student.id}|${kind}|${start}`),
      button("หลายวัน", `leave|range|${student.id}|${kind}|${start}`),
      button("เปลี่ยนวันเริ่ม", `leave|kind|${student.id}|${kind}`), button("ยกเลิก", "leave|cancel"),
    ], "date"); return true;
  }
  if (step === "quick") { await reasons(replyToken, student.id, kind, start, start); return true; }
  if (step === "one") { await reasons(replyToken, student.id, kind, start, start); return true; }
  if (step === "range") {
    const endLimit = iso(new Date(Math.min(term.endDate.getTime(), parseIso(start)!.getTime() + 30 * 86_400_000)));
    await choices(replyToken, `เริ่มลา ${thai(start)}\nเลือกวันสุดท้าย (ไม่เกิน 31 วัน)`, [dateButton("เลือกวันสุดท้าย", `leave|end|${student.id}|${kind}|${start}`, start, endLimit, start), button("ย้อนกลับ", `leave|date|${student.id}|${kind}|${start}`), button("ยกเลิก", "leave|cancel")], "date");
    return true;
  }
  const end = step === "end" ? date ?? parts[5] : parts[5];
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
    ], "review"); return true;
  }
  if (step === "confirm") {
    const typed = `ลา ${student.studentCode} ${kind === "SICK" ? "ป่วย" : "กิจ"} ${start}${start === end ? "" : ` ถึง ${end}`} ${reason.text}`;
    await handleLeaveLineMessage(lineUserId, typed, replyToken, eventId);
    return true;
  }
  await replyText(replyToken, "ไม่พบขั้นตอนนี้ กรุณากดแจ้งลาใหม่อีกครั้ง");
  return true;
}
