import { describe, expect, it } from "vitest";
import { createLineLinkCsv, filterLinkStudents, lineLinkPercentage, reportStudent, summarizeLinks, type LineLinkReport, type RawLinkStudent } from "@/features/line/line-link-report";
const raw: RawLinkStudent = { id: "student", studentCode: "00001", studentName: "นักเรียนตัวอย่าง", classroomId: "room", classroom: "ม.1/1", accounts: [
  { guardianName: "ผู้ปกครองตัวอย่าง", lineUserId: "Uprivate", code: "999999" },
  { guardianName: "ผู้ปกครอง (ผูกตรงกับนักเรียน)", lineUserId: "Uprivate", code: null },
  { guardianName: "อีกบัญชี", lineUserId: null, code: "001234" },
] };
describe("LINE binding report", () => {
  it("counts a student once and merges the same LINE account across sources", () => {
    const student = reportStudent(raw, new Map([["Uprivate", "ชื่อ LINE ตัวอย่าง"]]));
    expect(student.status).toBe("linked"); expect(student.linkedAccounts).toBe(1); expect(student.accounts).toHaveLength(2);
    expect(student.accounts[0]).toMatchObject({ code: null, lineName: "ชื่อ LINE ตัวอย่าง" });
    expect(JSON.stringify(student)).not.toContain("Uprivate");
    expect(summarizeLinks([student, student])).toMatchObject({ total: 1, linked: 1, pending: 0, percentage: 100 });
  });
  it("keeps pending and unprepared students in the denominator and handles no students", () => {
    const linked = reportStudent(raw);
    const pending = reportStudent({ ...raw, id: "pending", accounts: [{ guardianName: "ยังไม่ผูก", lineUserId: null, code: "000123" }] });
    const unprepared = reportStudent({ ...raw, id: "none", accounts: [] });
    expect(summarizeLinks([linked, pending, unprepared])).toEqual({ total: 3, linked: 1, pending: 1, unprepared: 1, percentage: 33.3 });
    expect(lineLinkPercentage(0, 0)).toBeNull();
    expect(filterLinkStudents([linked, pending, unprepared], "unlinked", "").map(student => student.id)).toEqual(["pending", "none"]);
    expect(filterLinkStudents([linked, pending], "pending", "000123")).toEqual([pending]);
  });
  it("exports BOM CSV with codes, protects text formulas, and never reveals consumed codes or raw LINE IDs", () => {
    const student = reportStudent({ ...raw, studentName: '=HYPERLINK("https://evil.example")' });
    const stats = summarizeLinks([student]);
    const report: LineLinkReport = { term: "ภาคเรียนตัวอย่าง", hasActiveTerm: true, generatedAt: "2026-11-15T00:00:00Z", rooms: [{ id: "room", code: "ม.1/1", ...stats }], overall: stats, selectedId: "room", students: [student] };
    const csv = createLineLinkCsv(report, [student]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"=""001234"""');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toContain("999999"); expect(csv).not.toContain("Uprivate");
    expect(csv).toContain("ผูกแล้ว (รหัสใช้ครั้งเดียว)");
  });
});
