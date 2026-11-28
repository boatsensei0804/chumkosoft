import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import { formatLinkPercentage, lineLinkPercentage, type LineLinkReport, type LinkReportStats } from "@/features/line/line-link-report";

const COLORS = { linked: "#2580d5", pending: "#c77a0a", unprepared: "#8695a8" };
const SERIES = [{ key: "linked", label: "ผูกแล้ว" }, { key: "pending", label: "มีรหัสรอผูก" }, { key: "unprepared", label: "ยังไม่มีรหัส" }] as const;
const number = (value: number) => value.toLocaleString("th-TH");

/** Vector charts with the same student denominator as the on-screen overview. */
export async function createLineLinkChartsPdf(report: LineLinkReport): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, autoFirstPage: false, info: { Title: "สรุปการผูกบัญชี LINE", Author: "Chumkosoft School" } });
  doc.registerFont("Prompt", path.join(process.cwd(), "public/fonts/prompt/Prompt-Regular.ttf"));
  doc.registerFont("PromptBold", path.join(process.cwd(), "public/fonts/prompt/Prompt-Bold.ttf"));
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Uint8Array>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const rooms = report.rooms.filter(room => report.selectedId === "all" || room.id === report.selectedId);
  const scope = report.selectedId === "all" ? report.overall : rooms[0];
  if (!scope) throw new Error("Invalid report classroom");
  const scopeLabel = report.selectedId === "all" ? "ภาพรวมทั้งโรงเรียน" : `ห้อง ${rooms[0].code}`;
  const text = (value: string, x: number, y: number, size = 9, bold = false, color = "#19314a", width = 535, align: "left" | "right" | "center" = "left") => {
    doc.font(bold ? "PromptBold" : "Prompt").fontSize(size).fillColor(color).text(value, x, y, { width, align, lineBreak: false });
  };
  const page = (continuation = false) => {
    doc.addPage(); doc.rect(0, 0, 595.28, 7).fill("#1767ae");
    text("กราฟสรุปการผูกบัญชี LINE", 30, 27, 19, true, "#183e6b");
    text(`${scopeLabel}${continuation ? " (ต่อ)" : ""}`, 30, 60, 12, true, "#1767ae");
    text(report.term, 30, 83, 9, false, "#50657c");
    text(`ข้อมูล ณ ${new Date(report.generatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`, 30, 100, 8, false, "#50657c");
  };
  const stackedBar = (stats: LinkReportStats, x: number, y: number, width: number, height: number) => {
    doc.rect(x, y, width, height).fill("#e5ebf2");
    if (!stats.total) return;
    let offset = x;
    for (const series of SERIES) {
      const segment = stats[series.key] / stats.total * width;
      if (segment > 0) doc.rect(offset, y, segment, height).fill(COLORS[series.key]);
      offset += segment;
    }
  };
  page();
  doc.roundedRect(30, 129, 535, 253, 12).fillAndStroke("#f4f9ff", "#dce5ee");
  text(`นักเรียนทั้งหมด ${number(scope.total)} คน`, 48, 145, 12, true, "#183e6b", 490);
  // A stroked polyline avoids bitmap scaling and renders tiny/100% segments faithfully.
  doc.circle(151, 258, 65).lineWidth(19).stroke("#e5ebf2");
  let angle = -Math.PI / 2;
  if (scope.total) for (const series of SERIES) {
    const sweep = scope[series.key] / scope.total * Math.PI * 2;
    if (sweep > 0) {
      const steps = Math.max(2, Math.ceil(sweep * 90));
      doc.save().lineWidth(19).lineJoin("round").moveTo(151 + 65 * Math.cos(angle), 258 + 65 * Math.sin(angle));
      for (let step = 1; step <= steps; step++) {
        const next = angle + sweep * step / steps;
        doc.lineTo(151 + 65 * Math.cos(next), 258 + 65 * Math.sin(next));
      }
      doc.stroke(COLORS[series.key]).restore();
    }
    angle += sweep;
  }
  doc.lineWidth(0.5);
  text(formatLinkPercentage(scope.percentage), 83, 240, 25, true, "#1767ae", 136, "center");
  text("ผูกแล้ว", 83, 279, 10, false, "#50657c", 136, "center");
  SERIES.forEach((series, index) => {
    const y = 187 + index * 57;
    doc.roundedRect(287, y + 4, 10, 10, 2).fill(COLORS[series.key]);
    text(series.label, 307, y, 10, true, "#19314a", 225);
    text(`${number(scope[series.key])} คน  |  ${formatLinkPercentage(lineLinkPercentage(scope[series.key], scope.total))}`, 307, y + 20, 12, true, "#183e6b", 225);
  });
  if (!scope.total) text("ยังไม่มีนักเรียนในขอบเขตนี้", 48, 352, 9, false, "#50657c", 490, "center");
  text("วิธีอ่านกราฟ", 30, 399, 10, true, "#183e6b");
  doc.font("Prompt").fontSize(8.5).fillColor("#50657c").text("นับนักเรียนคนละ 1 ครั้ง แม้มีผู้ปกครองหลายบัญชี ผูกแล้วหมายถึงมีบัญชี LINE อย่างน้อย 1 บัญชี ส่วนรอผูกและยังไม่มีรหัสนับเฉพาะนักเรียนที่ยังไม่มีบัญชีผูก เปอร์เซ็นต์แต่ละห้องเทียบกับนักเรียนทั้งหมดในห้องนั้น", 30, 419, { width: 535 });
  text("ข้อมูลครบตามห้องที่เลือก ไม่เปลี่ยนตามคำค้นหาหรือตัวกรองรายชื่อ", 30, 463, 8, false, "#50657c");

  const heading = (y: number) => {
    text("เปรียบเทียบสถานะรายห้อง", 30, y, 12, true, "#183e6b");
    doc.rect(30, y + 27, 535, 26).fill("#eaf4ff");
    text("ห้องเรียน", 38, y + 34, 8, true, "#183e6b", 90);
    text("สัดส่วนสถานะ (0 - 100%)", 138, y + 34, 8, true, "#183e6b", 270);
    text("ทั้งหมด", 414, y + 34, 8, true, "#183e6b", 60, "right");
    text("ผูกแล้ว", 483, y + 34, 8, true, "#183e6b", 73, "right");
    return y + 53;
  };
  let y = heading(491);
  if (!rooms.length) text("ยังไม่มีห้องเรียนในภาคเรียนปัจจุบัน", 38, y + 16, 10);
  for (const room of rooms) {
    if (y + 43 > 761) { page(true); y = heading(135); }
    doc.rect(30, y, 535, 43).fillAndStroke("#ffffff", "#dce5ee");
    doc.font("PromptBold").fontSize(8).fillColor("#183e6b").text(room.code, 38, y + 10, { width: 90, height: 27, ellipsis: true });
    stackedBar(room, 138, y + 8, 252, 10);
    text(`ผูก ${number(room.linked)}  |  รอ ${number(room.pending)}  |  ไม่มีรหัส ${number(room.unprepared)}`, 138, y + 24, 7, false, "#50657c", 270);
    text(number(room.total), 414, y + 10, 10, true, "#19314a", 60, "right");
    text(formatLinkPercentage(room.percentage), 483, y + 10, 10, true, "#1767ae", 73, "right");
    y += 43;
  }
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    text("สีฟ้า: ผูกแล้ว  |  สีส้ม: มีรหัสรอผูก  |  สีเทา: ยังไม่มีรหัส", 30, 780, 7, false, "#50657c");
    text("รายงานสถิติ ไม่มีรายชื่อหรือรหัสเชื่อมบัญชี", 30, 797, 7, false, "#50657c", 360);
    text(`Chumkosoft School  |  ${i + 1}/${range.count}`, 390, 797, 7, false, "#50657c", 175, "right");
  }
  doc.end();
  return complete;
}
