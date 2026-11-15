import { describe, expect, it } from "vitest";
import { summarizeDailyLeave, validReportDate } from "@/features/leave/daily-report";
describe("daily leave summary", () => {
  it("counts students once, separates statuses, and excludes rejected requests from percentages", () => {
    const rows = [
      { studentId: "a", kind: "SICK", status: "PENDING" },
      { studentId: "a", kind: "SICK", status: "APPROVED" },
      { studentId: "a", kind: "LATE", status: "APPROVED" },
      { studentId: "b", kind: "PERSONAL", status: "REJECTED" },
      { studentId: "c", kind: "PERSONAL", status: "APPROVED" },
    ] as const;
    const result = summarizeDailyLeave([...rows], 300);
    expect(result).toMatchObject({ requests: 5, students: 2, percentage: 0.7, statuses: { PENDING: 1, APPROVED: 3, REJECTED: 1 } });
    expect(result.kinds).toEqual([
      { kind: "SICK", students: 1, requests: 2, percentage: 0.3, pending: 1, approved: 1 },
      { kind: "PERSONAL", students: 1, requests: 1, percentage: 0.3, pending: 0, approved: 1 },
      { kind: "LATE", students: 1, requests: 1, percentage: 0.3, pending: 0, approved: 1 },
    ]);
  });
  it("does not invent a percentage for an empty school", () => {
    expect(summarizeDailyLeave([], 0).percentage).toBeNull();
    expect(summarizeDailyLeave([], 300).percentage).toBe(0);
  });
  it("validates actual calendar dates without rollover", () => {
    expect(validReportDate("2026-02-29")).toBe(false);
    expect(validReportDate("2028-02-29")).toBe(true);
    expect(validReportDate("2026-11-15")).toBe(true);
    expect(validReportDate("15/11/2026")).toBe(false);
  });
});
