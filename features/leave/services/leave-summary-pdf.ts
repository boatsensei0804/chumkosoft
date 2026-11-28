import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import { summarizeDailyLeave, type LeaveDailyReport } from "@/features/leave/daily-report";
import { requestKindLabel } from "@/features/leave/request-kind";

const number = (value: number) => value.toLocaleString("th-TH");
const percent = (value: number | null) => value === null ? "—" : `${number(value)}%`;
const KIND_COLORS = ["#2580d5", "#7165c8", "#c77a0a"];
const STATUSES = [{ key: "PENDING", label: "รอพิจารณา", color: "#c77a0a" }, { key: "APPROVED", label: "อนุมัติแล้ว", color: "#14866a" }, { key: "REJECTED", label: "ไม่อนุมัติ", color: "#c54b58" }] as const;

export async function createLeaveSummaryPdf(report: LeaveDailyReport): Promise<Uint8Array> {
  const summary = summarizeDailyLeave(report.items.filter(item => item.startDate <= report.date && item.endDate >= report.date), report.totalStudents);
  const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: "สรุปคำขอลาและขอมาสาย", Author: "Chumkosoft School" } });
  doc.registerFont("Prompt", path.join(process.cwd(), "public/fonts/prompt/Prompt-Regular.ttf"));
  doc.registerFont("PromptBold", path.join(process.cwd(), "public/fonts/prompt/Prompt-Bold.ttf"));
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Uint8Array>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const text = (value: string, x: number, y: number, size = 9, bold = false, color = "#19314a", width = 535, align: "left" | "right" | "center" = "left") => doc.font(bold ? "PromptBold" : "Prompt").fontSize(size).fillColor(color).text(value, x, y, { width, align, lineBreak: false });
  const date = new Intl.DateTimeFormat("th-TH", { timeZone: "UTC", dateStyle: "long" }).format(new Date(`${report.date}T00:00:00Z`));
  doc.rect(0, 0, 595.28, 7).fill("#1767ae");
  text("กราฟสรุปคำขอลา / ขอมาสาย", 30, 28, 19, true, "#183e6b");
  text(`ประจำวันที่ ${date}`, 30, 62, 12, true, "#1767ae");
  text(report.term ?? "ยังไม่มีภาคเรียนปัจจุบัน", 30, 85, 9, false, "#50657c");
  text(report.teacherScoped ? "ขอบเขต: เฉพาะห้องที่เป็นครูที่ปรึกษา | เปอร์เซ็นต์เทียบกับนักเรียนทั้งโรงเรียน" : "ขอบเขต: ทั้งโรงเรียน", 30, 104, 8, false, "#50657c");

  doc.roundedRect(30, 130, 535, 218, 12).lineWidth(0.5).fillAndStroke("#f4f9ff", "#dce5ee");
  text("นักเรียนที่มีคำขอ", 48, 147, 12, true, "#183e6b");
  const ratio = report.totalStudents > 0 ? Math.min(1, Math.max(0, summary.students / report.totalStudents)) : 0;
  doc.circle(145, 249, 58).lineWidth(17).stroke("#dfe8f2");
  if (ratio > 0) {
    doc.moveTo(145, 191);
    const steps = Math.max(2, Math.ceil(ratio * 360));
    for (let i = 1; i <= steps; i++) {
      const angle = -Math.PI / 2 + ratio * Math.PI * 2 * i / steps;
      doc.lineTo(145 + 58 * Math.cos(angle), 249 + 58 * Math.sin(angle));
    }
    doc.lineJoin("round").stroke("#2580d5");
  }
  doc.lineWidth(0.5);
  text(percent(summary.percentage), 84, 231, 24, true, "#1767ae", 122, "center");
  text(`${number(summary.students)} คน`, 84, 269, 10, true, "#19314a", 122, "center");
  text(`นักเรียนทั้งโรงเรียน ${number(report.totalStudents)} คน`, 270, 186, 12, true, "#183e6b", 275);
  text(`มีคำขอ ${number(summary.students)} คน (${percent(summary.percentage)})`, 270, 219, 11, true, "#1767ae", 275);
  text("รวมรอพิจารณาและอนุมัติ นับคนไม่ซ้ำ", 270, 252, 9, false, "#50657c", 275);
  text("ไม่นับคำขอที่ไม่อนุมัติหรือลบแล้ว", 270, 272, 9, false, "#50657c", 275);
  text("ไม่ใช่สรุปผู้มาเรียนหรือขาดเรียนจริง", 270, 302, 9, false, "#50657c", 275);

  text("เปรียบเทียบตามประเภทคำขอ", 30, 368, 12, true, "#183e6b");
  text("ความยาวแท่งแสดงจำนวนนักเรียน | เปอร์เซ็นต์เทียบกับนักเรียนทั้งโรงเรียน", 30, 390, 8, false, "#50657c");
  const step = Math.max(1, Math.ceil(Math.max(...summary.kinds.map(row => row.students)) / 4));
  const maximum = step * 4;
  summary.kinds.forEach((row, index) => {
    const y = 414 + index * 49;
    text(requestKindLabel(row.kind), 30, y, 10, true, "#183e6b", 100);
    text(`${number(row.students)} คน | ${percent(row.percentage)}`, 412, y, 10, true, "#183e6b", 153, "right");
    doc.rect(140, y + 2, 252, 12).fill("#e5ebf2");
    if (row.students) doc.rect(140, y + 2, row.students / maximum * 252, 12).fill(KIND_COLORS[index]);
    text(`${number(row.requests)} คำขอ | รอ ${number(row.pending)} | อนุมัติ ${number(row.approved)}`, 140, y + 20, 7.5, false, "#50657c", 380);
  });
  [0, step, step * 2, step * 3, maximum].forEach((value, index) => text(number(value), 130 + index * 63, 561, 7, false, "#50657c", 20, "center"));
  text("หน่วย: คน", 416, 561, 7, false, "#50657c", 149, "right");

  text(`สถานะการพิจารณา | ทั้งหมด ${number(summary.requests)} คำขอ`, 30, 590, 12, true, "#183e6b");
  text("สัดส่วนสถานะเทียบกับจำนวนคำขอในวันที่เลือก รวมคำขอที่ไม่อนุมัติ", 30, 613, 8, false, "#50657c");
  doc.rect(30, 638, 535, 16).fill("#e5ebf2");
  let offset = 30;
  STATUSES.forEach((status, index) => {
    const count = summary.statuses[status.key];
    const width = summary.requests > 0 ? count / summary.requests * 535 : 0;
    if (width > 0) doc.rect(offset, 638, width, 16).fill(status.color);
    offset += width;
    const x = 30 + index * 180;
    doc.roundedRect(x, 671, 8, 8, 1).fill(status.color);
    text(status.label, x + 15, 666, 9, true, "#19314a", 158);
    text(`${number(count)} คำขอ (${percent(summary.requests > 0 ? Math.round(count / summary.requests * 1000) / 10 : null)})`, x + 15, 688, 10, true, "#183e6b", 158);
  });
  if (!summary.requests) text("ไม่มีคำขอในวันที่เลือก", 30, 712, 8, false, "#50657c");
  doc.font("Prompt").fontSize(8).fillColor("#50657c").text("สรุปตามวันที่อยู่ในช่วงคำขอ ไม่ใช่วันที่ส่ง นับคนไม่ซ้ำในแต่ละประเภท นักเรียนอาจอยู่ได้หลายประเภท จึงไม่ควรบวกเปอร์เซ็นต์ของแต่ละประเภท รายงานใช้ข้อมูลครบตามวันที่เลือก ไม่เปลี่ยนตามตัวกรองรายชื่อ", 30, 741, { width: 535 });
  text("รายงานสถิติ ไม่มีชื่อ เหตุผลลา หรือข้อมูลบัญชี LINE ผู้ส่ง", 30, 803, 7, false, "#50657c", 370);
  text("Chumkosoft School | 1/1", 400, 803, 7, false, "#50657c", 165, "right");
  doc.end();
  return complete;
}
