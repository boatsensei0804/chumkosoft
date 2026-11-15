export type LinkReportStatus = "linked" | "pending" | "unprepared";
export type LinkReportFilter = "all" | "unlinked" | LinkReportStatus;
export const LINK_STATUS_LABELS: Record<LinkReportStatus, string> = { linked: "ผูกแล้ว", pending: "มีรหัสรอผูก", unprepared: "ยังไม่มีรหัส" };
export interface LinkReportAccount { guardianName: string; lineName: string | null; status: LinkReportStatus; code: string | null }
export interface LinkReportStudent { id: string; studentCode: string; studentName: string; classroomId: string; classroom: string; status: LinkReportStatus; accounts: LinkReportAccount[]; linkedAccounts: number }
export interface LinkReportStats { total: number; linked: number; pending: number; unprepared: number; percentage: number | null }
export interface LinkReportRoom extends LinkReportStats { id: string; code: string }
export interface LineLinkReport { term: string; hasActiveTerm: boolean; generatedAt: string; rooms: LinkReportRoom[]; overall: LinkReportStats; selectedId: string; students: LinkReportStudent[] }
/** Internal input only. Raw LINE user IDs never appear in report output. */
export interface RawLinkStudent { id: string; studentCode: string; studentName: string; classroomId: string; classroom: string; accounts: { guardianName: string; lineUserId: string | null; code: string | null }[] }

export function lineLinkPercentage(linked: number, total: number): number | null { return total > 0 ? Math.round(linked / total * 1000) / 10 : null; }
export function formatLinkPercentage(value: number | null): string { return value === null ? "—" : `${value.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`; }

export function reportStudent(raw: RawLinkStudent, names: Map<string, string> = new Map()): LinkReportStudent {
  const linked = new Map<string, LinkReportAccount>();
  const remaining: LinkReportAccount[] = [];
  for (const account of raw.accounts) {
    if (account.lineUserId) {
      const prior = linked.get(account.lineUserId);
      if (!prior) linked.set(account.lineUserId, { guardianName: account.guardianName, lineName: names.get(account.lineUserId) ?? null, status: "linked", code: null });
      else if (prior.guardianName === "ผู้ปกครอง (ผูกตรงกับนักเรียน)") prior.guardianName = account.guardianName;
    } else remaining.push({ guardianName: account.guardianName, lineName: null, status: account.code ? "pending" : "unprepared", code: account.code || null });
  }
  const accounts = [...linked.values(), ...remaining];
  const status: LinkReportStatus = linked.size > 0 ? "linked" : accounts.some(account => account.status === "pending") ? "pending" : "unprepared";
  return { id: raw.id, studentCode: raw.studentCode, studentName: raw.studentName, classroomId: raw.classroomId, classroom: raw.classroom, status, accounts, linkedAccounts: linked.size };
}

export function summarizeLinks(students: LinkReportStudent[]): LinkReportStats {
  const unique = [...new Map(students.map(student => [student.id, student])).values()];
  const linked = unique.filter(student => student.status === "linked").length;
  const pending = unique.filter(student => student.status === "pending").length;
  return { total: unique.length, linked, pending, unprepared: unique.length - linked - pending, percentage: lineLinkPercentage(linked, unique.length) };
}
export function filterLinkStudents(students: LinkReportStudent[], filter: LinkReportFilter, search: string): LinkReportStudent[] {
  const q = search.trim().toLocaleLowerCase();
  return students.filter(student => (filter === "all" || (filter === "unlinked" ? student.status !== "linked" : student.status === filter)) &&
    (!q || [student.studentCode, student.studentName, ...student.accounts.flatMap(account => [account.guardianName, account.lineName ?? "", account.code ?? ""])].some(value => value.toLocaleLowerCase().includes(q))));
}

/** Protect user-supplied text from spreadsheet formula interpretation. */
function csvText(value: string): string {
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
/** Only a validated numeric literal may use Excel's constant-string notation,
 * preserving leading zeros without allowing arbitrary formulas. */
function csvIdentifier(value: string): string { return /^\d{1,80}$/.test(value) ? `"=""${value}"""` : csvText(value); }
export function createLineLinkCsv(report: LineLinkReport, students: LinkReportStudent[]): string {
  const lines = [["ห้อง", "รหัสนักเรียน", "ชื่อนักเรียน", "สถานะนักเรียน", "ผู้ปกครอง", "ชื่อ LINE", "สถานะบัญชี", "รหัสรอผูก", "นักเรียนทั้งหมดในห้อง", "ผูกแล้วในห้อง", "เปอร์เซ็นต์ผูกในห้อง", "ภาคเรียน", "ข้อมูล ณ"].map(csvText).join(",")];
  for (const student of students) {
    const room = report.rooms.find(room => room.id === student.classroomId);
    const accounts = student.accounts.length ? student.accounts : [{ guardianName: "ยังไม่มีบัญชี/ข้อมูลผู้ปกครอง", lineName: null, status: "unprepared" as const, code: null }];
    for (const account of accounts) lines.push([
      csvText(student.classroom), csvIdentifier(student.studentCode), csvText(student.studentName), csvText(LINK_STATUS_LABELS[student.status]), csvText(account.guardianName), csvText(account.lineName ?? (account.status === "linked" ? "ผูกแล้ว · ชื่อ LINE ไม่พร้อม" : "—")), csvText(LINK_STATUS_LABELS[account.status]), account.code ? csvIdentifier(account.code) : csvText(account.status === "linked" ? "ผูกแล้ว (รหัสใช้ครั้งเดียว)" : "—"), csvText(String(room?.total ?? 0)), csvText(String(room?.linked ?? 0)), csvText(formatLinkPercentage(room?.percentage ?? null)), csvText(report.term), csvText(report.generatedAt),
    ].join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
