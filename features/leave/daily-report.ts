export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LeaveKind = "SICK" | "PERSONAL" | "LATE";
export interface LeaveItem {
  id: string; studentId: string; studentCode: string; studentName: string; classroomCode: string;
  kind: LeaveKind; expectedArrivalTime: string | null; startDate: string; endDate: string;
  reason: string; status: LeaveStatus; reviewNote: string | null; advisorNotifiedCount: number;
  advisorTargetCount: number; createdAt: string;
  sender: { displayName: string | null; guardianNames: string[]; reference: string };
}
export interface LeaveDailyReport { date: string; term: string | null; totalStudents: number; teacherScoped: boolean; allDates: boolean; items: LeaveItem[] }
export function validReportDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
/** Counts affected students once; rejected requests never imply the student is on leave. */
export function summarizeDailyLeave(items: Pick<LeaveItem, "studentId" | "kind" | "status">[], totalStudents: number) {
  const active = items.filter(item => item.status !== "REJECTED");
  const unique = (rows: typeof items) => new Set(rows.map(item => item.studentId)).size;
  const percent = (count: number) => totalStudents > 0 ? Math.round(count / totalStudents * 1000) / 10 : null;
  const students = unique(active);
  return {
    requests: items.length, students, percentage: percent(students),
    statuses: { PENDING: items.filter(item => item.status === "PENDING").length, APPROVED: items.filter(item => item.status === "APPROVED").length, REJECTED: items.filter(item => item.status === "REJECTED").length },
    kinds: (["SICK", "PERSONAL", "LATE"] as const).map(kind => {
      const rows = active.filter(item => item.kind === kind);
      const count = unique(rows);
      return { kind, students: count, requests: rows.length, percentage: percent(count), pending: rows.filter(item => item.status === "PENDING").length, approved: rows.filter(item => item.status === "APPROVED").length };
    }),
  };
}
