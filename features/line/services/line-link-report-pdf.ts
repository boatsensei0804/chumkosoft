import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import { LINK_STATUS_LABELS, formatLinkPercentage, type LineLinkReport, type LinkReportStudent } from "@/features/line/line-link-report";

const REGULAR = path.join(process.cwd(), "offline_scanner/fonts/Prompt-Regular.ttf");
const BOLD = path.join(process.cwd(), "offline_scanner/fonts/Prompt-Bold.ttf");
const WIDTHS = [24, 55, 123, 63, 180, 90];
const HEADERS = ["ที่", "รหัสนักเรียน", "ชื่อนักเรียน", "สถานะนักเรียน", "ผู้ปกครอง / LINE / สถานะบัญชี", "รหัสรอผูก"];

export async function createLineLinkReportPdf(report: LineLinkReport, students: LinkReportStudent[]): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false, bufferPages: true, compress: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Uint8Array>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const rooms = report.rooms.filter(room => report.selectedId === "all" || room.id === report.selectedId);
  for (const room of rooms) {
    const roster = students.filter(student => student.classroomId === room.id);
    let y = 0;
    const addPage = () => {
      doc.addPage();
      doc.rect(0, 0, 595.28, 6).fill("#1767ae");
      doc.font(BOLD).fontSize(16).fillColor("#183e6b").text(`รายงานการผูก LINE · ห้อง ${room.code}`, 30, 24, { width: 535 });
      doc.font(REGULAR).fontSize(9).fillColor("#50657c").text(report.term, 30, 52, { width: 535 });
      doc.text(`ทั้งหมด ${room.total} คน · ผูกแล้ว ${room.linked} · รอผูก ${room.pending} · ไม่มีรหัส ${room.unprepared} · ผูกแล้ว ${formatLinkPercentage(room.percentage)}`, 30, 70, { width: 535 });
      doc.fontSize(8).text(`รายชื่อที่ส่งออก ${roster.length} คน · ข้อมูล ณ ${new Date(report.generatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`, 30, 90, { width: 535 });
      doc.text("นับนักเรียนคนละ 1 ครั้ง แม้มีหลายบัญชี · รายละเอียดแสดงแยกแถวบัญชี", 30, 106, { width: 535 });
      y = 128; let x = 30;
      HEADERS.forEach((header, i) => { doc.rect(x, y, WIDTHS[i], 34).fillAndStroke("#eaf4ff", "#cad9e8"); doc.font(BOLD).fontSize(8).fillColor("#183e6b").text(header, x + 4, y + 7, { width: WIDTHS[i] - 8 }); x += WIDTHS[i]; });
      y += 34;
    };
    addPage();
    if (!roster.length) doc.font(REGULAR).fontSize(11).fillColor("#50657c").text("ไม่มีรายชื่อที่ตรงกับตัวกรองในห้องนี้", 30, y + 20, { width: 535 });
    roster.forEach((student, index) => {
      const accounts = student.accounts.length ? student.accounts : [{ guardianName: "ยังไม่มีบัญชี/ข้อมูลผู้ปกครอง", lineName: null, status: "unprepared" as const, code: null }];
      for (const account of accounts) {
        const cells = [String(index + 1), student.studentCode, student.studentName, LINK_STATUS_LABELS[student.status], `${account.guardianName}\nLINE: ${account.lineName ?? (account.status === "linked" ? "ผูกแล้ว · ชื่อไม่พร้อม" : "—")}\nบัญชี: ${LINK_STATUS_LABELS[account.status]}`, account.code ?? (account.status === "linked" ? "ผูกแล้ว\n(รหัสใช้ครั้งเดียว)" : "—")].map(value => value.length > 250 ? `${value.slice(0, 249)}…` : value);
        doc.font(REGULAR).fontSize(8);
        const height = Math.max(48, ...cells.map((cell, i) => doc.heightOfString(cell, { width: WIDTHS[i] - 8 }) + 14));
        if (y + height > 780) addPage();
        let x = 30;
        cells.forEach((cell, i) => { doc.rect(x, y, WIDTHS[i], height).fillAndStroke(index % 2 ? "#f5f9ff" : "#ffffff", "#dce5ee"); doc.font(i === 5 && account.code ? BOLD : REGULAR).fontSize(i === 5 && account.code ? 11 : 8).fillColor(i === 5 && account.code ? "#155b9d" : "#19314a").text(cell, x + 4, y + 6, { width: WIDTHS[i] - 8 }); x += WIDTHS[i]; });
        y += height;
      }
    });
  }
  if (!rooms.length) { doc.addPage(); doc.font(REGULAR).fontSize(12).text("ยังไม่มีข้อมูลห้องเรียน", 30, 40); }
  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    doc.font(REGULAR).fontSize(7).fillColor("#50657c").text("ข้อมูลภายในโรงเรียน · รหัสที่แสดงเป็นรหัสรอผูกเท่านั้น · ชื่อ LINE อาจไม่พร้อมขณะออกรายงาน", 30, 796, { width: 535, lineBreak: false });
    doc.text(`Chumkosoft School · หน้า ${page + 1}/${range.count}`, 30, 814, { width: 535, align: "right", lineBreak: false });
  }
  doc.end();
  return complete;
}
