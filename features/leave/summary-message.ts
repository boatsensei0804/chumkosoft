import { summarizeDailyLeave, type LeaveDailyReport, type LeaveItem } from "@/features/leave/daily-report";
import { requestKindLabel } from "@/features/leave/request-kind";
const STATUS = { PENDING: "รอพิจารณา", APPROVED: "อนุมัติแล้ว", REJECTED: "ไม่อนุมัติ" };
const number = (value: number) => value.toLocaleString("th-TH");
const percent = (value: number | null) => value === null ? "ไม่มีจำนวนนักเรียนสำหรับคำนวณ" : `${number(value)}%`;
const oneLine = (value: string) => value.replace(/[\r\n\t]+/g, " ").trim();

/** Share the selected day's totals, independent of list filters and pagination. */
export function createLeaveSummaryMessage(report: LeaveDailyReport, includeNames = false): string {
  const rows = report.items.filter(item => item.startDate <= report.date && item.endDate >= report.date);
  const summary = summarizeDailyLeave(rows, report.totalStudents);
  const date = new Intl.DateTimeFormat("th-TH", { timeZone: "UTC", dateStyle: "long" }).format(new Date(`${report.date}T00:00:00Z`));
  const lines = ["📋 สรุปคำขอลา / ขอมาสาย", `ประจำวันที่ ${date}`, oneLine(report.term ?? "ยังไม่มีภาคเรียนปัจจุบัน"),
    report.teacherScoped ? "ขอบเขต: เฉพาะห้องที่เป็นครูที่ปรึกษา" : "ขอบเขต: ทั้งโรงเรียน",
    `นักเรียนทั้งโรงเรียน ${number(report.totalStudents)} คน`, "",
    `นักเรียนที่มีคำขอ ${number(summary.students)} คน (${percent(summary.percentage)})`,
    "รวมรอพิจารณาและอนุมัติ · ไม่นับคำขอที่ไม่อนุมัติ", "",
    ...summary.kinds.map(row => `• ${requestKindLabel(row.kind)} ${number(row.students)} คน (${percent(row.percentage)}) · รอ ${number(row.pending)} / อนุมัติ ${number(row.approved)} คำขอ`),
    "", `สถานะคำขอทั้งหมด ${number(summary.requests)} คำขอ`,
    `⏳ รอพิจารณา ${number(summary.statuses.PENDING)} คำขอ`,
    `✅ อนุมัติแล้ว ${number(summary.statuses.APPROVED)} คำขอ`,
    `❌ ไม่อนุมัติ ${number(summary.statuses.REJECTED)} คำขอ`,
  ];
  if (includeNames) {
    const groups = new Map<string, LeaveItem[]>();
    for (const row of rows.filter(item => item.status !== "REJECTED")) {
      const group = groups.get(row.classroomCode) ?? [];
      group.push(row); groups.set(row.classroomCode, group);
    }
    lines.push("", "รายชื่อนักเรียนแยกห้อง (รอพิจารณา / อนุมัติ)");
    if (!groups.size) lines.push("ไม่มีรายชื่อในกลุ่มนี้");
    for (const [room, roomRows] of [...groups].sort(([a], [b]) => a.localeCompare(b, "th", { numeric: true }))) {
      lines.push(`ห้อง ${oneLine(room)}`);
      const byStudent = new Map<string, LeaveItem[]>();
      for (const row of roomRows) { const entries = byStudent.get(row.studentId) ?? []; entries.push(row); byStudent.set(row.studentId, entries); }
      for (const entries of [...byStudent.values()].sort((a, b) => a[0].studentCode.localeCompare(b[0].studentCode, "th", { numeric: true }))) {
        const descriptions = [...new Set(entries.map(item => `${requestKindLabel(item.kind)}${item.kind === "LATE" && item.expectedArrivalTime ? ` (คาดถึง ${oneLine(item.expectedArrivalTime)} น.)` : ""} · ${STATUS[item.status]}`))];
        lines.push(`- ${oneLine(entries[0].studentName)}: ${descriptions.join(" / ")}`);
      }
    }
  }
  lines.push("", "หมายเหตุ: เปอร์เซ็นต์เทียบกับนักเรียนทั้งโรงเรียน นับคนไม่ซ้ำในแต่ละประเภท นักเรียนอาจอยู่หลายประเภท", "เป็นสรุปคำขอของวันที่เลือก ไม่ใช่ผลมาเรียน/ขาดเรียนจริง");
  return lines.join("\n");
}

/** Keep a long draft in contiguous, copyable parts, preferring line boundaries. */
export function splitLeaveSummaryMessage(text: string): string[] {
  const parts: string[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + 3500, text.length);
    if (end < text.length) {
      const newline = text.lastIndexOf("\n", end - 1);
      if (newline > start) end = newline + 1;
      else if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    parts.push(text.slice(start, end)); start = end;
  }
  return parts.length ? parts : [""];
}
