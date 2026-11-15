import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import LeaveRequestsBrowser from "@/features/leave/components/leave-requests-browser";
import { getLeaveDailyReport } from "@/features/leave/services/leave-daily-report-service";
import { bangkokToday, validReportDate } from "@/features/leave/daily-report";
import { requireRoles } from "@/lib/dal";

export const metadata: Metadata = { title: "คำขอลา / ขอมาสาย · chumkosoft" };
export const dynamic = "force-dynamic";

export default async function LeaveRequestsPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }): Promise<React.ReactNode> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  const params = await searchParams;
  const date = typeof params.date === "string" && validReportDate(params.date) ? params.date : bangkokToday();
  const report = await getLeaveDailyReport(user, date, params.view === "all");
  return <>
    <PageHeader title="คำขอลา / ขอมาสายจากผู้ปกครอง" subtitle="ภาพรวมรายวัน · รายละเอียด LINE ผู้ส่ง · ตรวจและพิจารณาคำขอ" />
    <LeaveRequestsBrowser key={`${date}-${report.allDates}`} report={report} isAdmin={user.role === "ADMIN"} />
  </>;
}
