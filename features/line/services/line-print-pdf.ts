import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { getClassroomGuardianPrintData } from "@/features/guardians/services/guardian-service";

type Records = Awaited<ReturnType<typeof getClassroomGuardianPrintData>>;
type Room = { classroom: string; records: Records };
type Card = { studentName: string; studentCode: string; guardianName: string; relation: string; linkCode: string };
type Document = InstanceType<typeof PDFDocument>;

const WIDTH = 595.28;
const CARD_WIDTH = (WIDTH - 75) / 2;
const FONT_DIR = path.join(process.cwd(), "offline_scanner", "fonts");
const REGULAR = path.join(FONT_DIR, "Prompt-Regular.ttf");
const BOLD = path.join(FONT_DIR, "Prompt-Bold.ttf");
const BLUE = "#155b9d";
const INK = "#19314a";
const MUTED = "#5a7085";

function cardsFor(records: Records): Card[] {
  return records.flatMap((student) => [
    ...student.lineAccounts.filter((account) => account.linkCode).map((account) => ({
      studentName: student.studentName,
      studentCode: student.studentCode,
      guardianName: "ผู้ปกครองของนักเรียน",
      relation: "",
      linkCode: account.linkCode!,
    })),
    ...student.guardians.filter((guardian) => guardian.linkCode).map((guardian) => ({
      studentName: student.studentName,
      studentCode: student.studentCode,
      guardianName: [guardian.prefix, guardian.fullName].filter(Boolean).join(" "),
      relation: guardian.relation,
      linkCode: guardian.linkCode!,
    })),
  ]);
}

function line(doc: Document, value: string, x: number, y: number, width: number, size: number, color: string, bold = false): void {
  doc.font(bold ? BOLD : REGULAR).fontSize(size).fillColor(color);
  let text = value;
  if (doc.widthOfString(text) > width) {
    const characters = Array.from(value);
    while (characters.length && doc.widthOfString(`${characters.join("")}…`) > width) characters.pop();
    text = `${characters.join("")}…`;
  }
  doc.text(text, x, y, { width, lineBreak: false });
}

function drawCard(doc: Document, card: Card, x: number, y: number, qr: Buffer): void {
  const width = CARD_WIDTH;
  doc.roundedRect(x, y, width, 220, 7).fillAndStroke("#ffffff", "#cadfea");
  doc.roundedRect(x, y, width, 36, 7).fill("#e8f4ff");
  line(doc, "เอกสารเชื่อม LINE ผู้ปกครอง", x + 13, y + 10, width - 26, 10, BLUE, true);
  line(doc, "นักเรียน", x + 13, y + 52, width - 110, 8, MUTED);
  line(doc, card.studentName, x + 13, y + 69, width - 110, 11, INK, true);
  line(doc, `รหัส ${card.studentCode}`, x + 13, y + 88, width - 110, 8, MUTED);
  line(doc, "ผู้ปกครอง", x + 13, y + 109, width - 110, 8, MUTED);
  line(doc, card.guardianName, x + 13, y + 126, width - 110, 9.5, INK, true);
  if (card.relation) line(doc, card.relation, x + 13, y + 143, width - 110, 7.5, MUTED);
  doc.image(qr, x + width - 90, y + 60, { width: 77, height: 77 });
  line(doc, "1. สแกน QR เพิ่มเพื่อน LINE OA", x + 13, y + 159, width - 26, 8, INK);
  line(doc, "2. ส่งรหัสด้านล่างในแชท แล้วรอยืนยัน", x + 13, y + 173, width - 26, 8, INK);
  doc.roundedRect(x + 11, y + 190, width - 22, 26, 4).fill("#e8f4ff");
  line(doc, "รหัสผูกบัญชี", x + 19, y + 198, width - 120, 8, MUTED);
  line(doc, card.linkCode, x + width - 90, y + 194, 76, 15, BLUE, true);
}

export async function createLinePrintPdf(rooms: Room[], oaUrl: string): Promise<Uint8Array> {
  const qrUrl = await QRCode.toDataURL(oaUrl, { width: 320, margin: 1, errorCorrectionLevel: "M" });
  const qr = Buffer.from(qrUrl.split(",")[1], "base64");
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false, compress: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Uint8Array>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  for (const room of rooms) {
    const cards = cardsFor(room.records);
    const pageCount = Math.max(1, Math.ceil(cards.length / 6));
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      doc.addPage();
      line(doc, `เอกสารเชื่อม LINE · ห้อง ${room.classroom}`, 30, 29, WIDTH - 60, 16, BLUE, true);
      line(doc, `${cards.length} ใบ  ·  หน้า ${pageIndex + 1}/${pageCount}`, 30, 52, WIDTH - 60, 9, MUTED);
      doc.moveTo(30, 73).lineTo(WIDTH - 30, 73).strokeColor("#cadfea").stroke();
      const portion = cards.slice(pageIndex * 6, pageIndex * 6 + 6);
      if (portion.length === 0) line(doc, "ห้องนี้ยังไม่มีรหัสรอเชื่อม LINE", 30, 100, WIDTH - 60, 12, MUTED);
      portion.forEach((card, index) => {
        const x = 30 + (index % 2) * (CARD_WIDTH + 15);
        const y = 82 + Math.floor(index / 2) * 233;
        drawCard(doc, card, x, y, qr);
      });
      line(doc, "Chumkosoft School · สำหรับแจกผู้ปกครองเท่านั้น", 30, 810, WIDTH - 60, 8, MUTED);
    }
  }
  doc.end();
  return finished;
}
