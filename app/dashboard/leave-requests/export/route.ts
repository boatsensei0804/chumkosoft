import { requireRoles } from "@/lib/dal";
import { validReportDate } from "@/features/leave/daily-report";
import { getLeaveDailyReport } from "@/features/leave/services/leave-daily-report-service";
import { createLeaveSummaryPdf } from "@/features/leave/services/leave-summary-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request): Promise<Response> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!validReportDate(date)) return new Response("กรุณาระบุวันที่รายงานให้ถูกต้อง", { status: 400 });
  const report = await getLeaveDailyReport(user, date);
  if (!report.term) return new Response("ยังไม่มีภาคเรียนปัจจุบัน", { status: 409 });
  const data = new Uint8Array(await createLeaveSummaryPdf(report));
  return new Response(data, { headers: {
    "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="chumkosoft-leave-summary-${date}.pdf"`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } });
}
