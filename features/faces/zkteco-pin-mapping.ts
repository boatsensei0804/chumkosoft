import { z } from "zod";

export const scannerPinSchema = z.string().trim().regex(/^\d{1,9}$/u);
export const scannerPinMappingSchema = z.object({
  pin: scannerPinSchema,
  studentCode: z.string().trim().min(1).max(80),
});
export type ScannerPinMappingInput = z.infer<typeof scannerPinMappingSchema>;

export const maxPinMappingCsvBytes = 128 * 1024;
const maxCsvRows = 500;
const twoColumns = /^("(?:[^"]|"")*"|[^",]*),("(?:[^"]|"")*"|[^",]*)$/u;

function readCell(value: string): string {
  return value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value.trim();
}

export function parsePinMappingCsv(text: string): { rows: ScannerPinMappingInput[] } | { error: string } {
  const [header, ...lines] = text.replace(/^\uFEFF/u, "").split(/\r?\n/u);
  const columns = twoColumns.exec(header.trim());
  if (columns?.slice(1).map(readCell).join(",") !== "pin,studentCode") {
    return { error: "หัวตาราง CSV ต้องเป็น pin,studentCode" };
  }

  const rows: ScannerPinMappingInput[] = [];
  const pins = new Set<string>();
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    const fields = twoColumns.exec(line.trim());
    const row = fields && scannerPinMappingSchema.safeParse({ pin: readCell(fields[1]), studentCode: readCell(fields[2]) });
    if (!row?.success) return { error: `ข้อมูลไม่ถูกต้องที่บรรทัด ${index + 2}` };
    if (pins.has(row.data.pin)) return { error: `รหัสเครื่องซ้ำที่บรรทัด ${index + 2}` };
    pins.add(row.data.pin);
    rows.push(row.data);
    if (rows.length > maxCsvRows) return { error: "นำเข้าได้สูงสุด 500 รายการต่อไฟล์" };
  }
  return rows.length ? { rows } : { error: "ไฟล์ไม่มีรายการให้จับคู่" };
}
