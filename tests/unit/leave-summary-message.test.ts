import { describe, expect, it } from "vitest";
import { createLeaveSummaryMessage, splitLeaveSummaryMessage } from "@/features/leave/summary-message";
import type { LeaveDailyReport, LeaveItem } from "@/features/leave/daily-report";
const item = (overrides: Partial<LeaveItem> = {}): LeaveItem => ({ id: "request", studentId: "student", studentCode: "001", studentName: "ชื่อนักเรียนทดสอบ", classroomCode: "ม.1/1", kind: "SICK", status: "PENDING", startDate: "2026-11-14", endDate: "2026-11-16", reason: "เหตุผลส่วนตัวที่ไม่ส่งต่อ", expectedArrivalTime: null, reviewNote: null, advisorNotifiedCount: 1, advisorTargetCount: 1, createdAt: "2026-11-13T00:00:00Z", sender: { displayName: "ชื่อ LINE ลับ", guardianNames: ["ชื่อผู้ปกครองลับ"], reference: "PRIVATE_REFERENCE" }, ...overrides });
const report = (items: LeaveItem[]): LeaveDailyReport => ({ date: "2026-11-15", term: "ภาคเรียน 2/2569", totalStudents: 300, teacherScoped: false, allDates: true, items });
describe("copyable leave summary", () => {
  it("matches the selected day, counts distinct students, and separates requests from students", () => {
    const text = createLeaveSummaryMessage(report([item(), item({ id: "duplicate", status: "APPROVED" }), item({ studentId: "rejected", status: "REJECTED" }), item({ studentId: "future", startDate: "2026-11-16" })]));
    expect(text).toContain("15 พฤศจิกายน 2569");
    expect(text).toContain("นักเรียนที่มีคำขอ 1 คน (0.3%)");
    expect(text).toContain("สถานะคำขอทั้งหมด 3 คำขอ");
    expect(text).toContain("ลาป่วย 1 คน (0.3%) · รอ 1 / อนุมัติ 1 คำขอ");
    expect(text).not.toContain("ชื่อนักเรียนทดสอบ");
  });
  it("only includes opted-in, non-rejected student names and never shares reasons or sender accounts", () => {
    const text = createLeaveSummaryMessage(report([item(), item({ id: "duplicate" }), item({ studentId: "other", studentName: "คนที่ถูกปฏิเสธ", status: "REJECTED" }), item({ studentId: "late", studentName: "นักเรียนมาสาย", kind: "LATE", expectedArrivalTime: "09:30", status: "APPROVED", classroomCode: "ม.1/2" })]), true);
    expect(text.split("ชื่อนักเรียนทดสอบ")).toHaveLength(2);
    expect(text).toContain("ห้อง ม.1/1"); expect(text).toContain("ห้อง ม.1/2");
    expect(text).toContain("นักเรียนมาสาย: ขอมาสาย (คาดถึง 09:30 น.) · อนุมัติแล้ว");
    for (const value of ["คนที่ถูกปฏิเสธ", "เหตุผลส่วนตัวที่ไม่ส่งต่อ", "ชื่อ LINE ลับ", "ชื่อผู้ปกครองลับ", "PRIVATE_REFERENCE"]) expect(text).not.toContain(value);
  });
  it("labels the advisor scope and empty denominators without inventing percentages", () => {
    const text = createLeaveSummaryMessage({ ...report([]), teacherScoped: true, totalStudents: 0 });
    expect(text).toContain("เฉพาะห้องที่เป็นครูที่ปรึกษา");
    expect(text).toContain("ไม่มีจำนวนนักเรียนสำหรับคำนวณ"); expect(text).not.toContain("NaN");
  });
  it("splits long messages without losing text or breaking emoji surrogate pairs", () => {
    const text = ("ชื่อภาษาไทย 🐰 รายชื่อ\n".repeat(700)) + "จบข้อความ";
    const parts = splitLeaveSummaryMessage(text);
    expect(parts.length).toBeGreaterThan(1); expect(parts.join("")).toBe(text);
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(3500);
    const long = "ก".repeat(3499) + "🐰" + "ข".repeat(4000);
    const longParts = splitLeaveSummaryMessage(long);
    expect(longParts.join("")).toBe(long); expect(longParts[0]).toHaveLength(3499);
  });
});
