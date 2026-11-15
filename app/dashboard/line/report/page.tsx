import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/features/dashboard/components/page-header";
import LineLinkReportView from "@/features/line/components/line-link-report-view";
import { getLineLinkReport, InvalidReportClassroom } from "@/features/line/services/line-link-report-service";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
export const metadata: Metadata = { title: "สรุปการผูกบัญชี LINE · chumkosoft" };
export const dynamic = "force-dynamic";
export default async function LineLinkReportPage({ searchParams }: { searchParams: Promise<{ classroom?: string }> }): Promise<React.ReactNode> {
  await requireRoles(STAFF_ROLES);
  const { classroom } = await searchParams;
  const report = await getLineLinkReport(classroom ?? "all").catch(error => { if (error instanceof InvalidReportClassroom) notFound(); throw error; });
  return <><PageHeader compact title="สรุปการผูกบัญชี LINE" subtitle="เปอร์เซ็นต์ภาพรวมและรายห้อง · รายชื่อ บัญชี และรหัสรอผูก · ส่งออก CSV / PDF" /><LineLinkReportView key={report.selectedId} report={report} /></>;
}
