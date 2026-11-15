import { createLineLinkChartsPdf } from "@/features/line/services/line-link-charts-pdf";
import { z } from "zod";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { createLineLinkCsv, filterLinkStudents } from "@/features/line/line-link-report";
import { getLineLinkReport, InvalidReportClassroom } from "@/features/line/services/line-link-report-service";
import { createLineLinkReportPdf } from "@/features/line/services/line-link-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const querySchema = z.object({ view: z.enum(["details", "charts"]), format: z.enum(["csv", "pdf"]), classroom: z.string().min(1).max(150), filter: z.enum(["all", "unlinked", "linked", "pending", "unprepared"]), q: z.string().max(100) });
export async function GET(request: Request): Promise<Response> {
  await requireRoles(STAFF_ROLES);
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({ view: params.get("view") ?? "details", format: params.get("format") ?? "csv", classroom: params.get("classroom") ?? "all", filter: params.get("filter") ?? "all", q: params.get("q") ?? "" });
  if (!parsed.success) return new Response("ตัวกรองรายงานไม่ถูกต้อง", { status: 400 });
  if (parsed.data.view === "charts" && parsed.data.format !== "pdf") return new Response("กราฟสรุปรองรับ PDF เท่านั้น", { status: 400 });
  try {
    const report = await getLineLinkReport(parsed.data.classroom);
    if (!report.hasActiveTerm) return new Response("ยังไม่มีภาคเรียนปัจจุบัน", { status: 409 });
    const students = filterLinkStudents(report.students, parsed.data.filter, parsed.data.q);
    const pdf = parsed.data.format === "pdf";
    const data = parsed.data.view === "charts" ? new Uint8Array(await createLineLinkChartsPdf(report)) : pdf ? new Uint8Array(await createLineLinkReportPdf(report, students)) : createLineLinkCsv(report, students);
    const extension = pdf ? "pdf" : "csv";
    const roomName = report.rooms.find(room => room.id === parsed.data.classroom)?.code ?? "ทุกห้อง";
    const filename = `รายงาน${parsed.data.view === "charts" ? "กราฟ" : "ผูก"}-LINE-${roomName.replace(/[\\/:*?"<>|\r\n]/g, "-")}.${extension}`;
    return new Response(data, { headers: { "Content-Type": pdf ? "application/pdf" : "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="chumkosoft-line-link-report.${extension}"; filename*=UTF-8''${encodeURIComponent(filename)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof InvalidReportClassroom) return new Response(error.message, { status: 404 });
    throw error;
  }
}
