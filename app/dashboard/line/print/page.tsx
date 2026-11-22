import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { requireRoles } from "@/lib/dal";
import { advisoryClassroomIds } from "@/lib/teacher-data-access";
import { STAFF_ROLES } from "@/features/auth/roles";
import { getClassroomGuardianPrintData, listGuardianClassrooms } from "@/features/guardians/services/guardian-service";
import LinePrintSheet from "@/features/line/components/line-print-sheet";

export const metadata: Metadata = { title: "เอกสารเชื่อม LINE · chumkosoft" };
export const dynamic = "force-dynamic";

interface PrintPageProps {
  searchParams: Promise<{ classroom?: string; oa?: string }>;
}

export default async function LinePrintPage({ searchParams }: PrintPageProps): Promise<React.ReactNode> {
  const user = await requireRoles(STAFF_ROLES);
  const { classroom: classroomId, oa } = await searchParams;
  if (!classroomId || !oa) notFound();
  const oaUrl = safeLineOaUrl(oa);
  if (!oaUrl) notFound();

  if (user.role !== "ADMIN" && !(await advisoryClassroomIds(user)).includes(classroomId)) notFound();
  const classrooms = await listGuardianClassrooms();
  const classroom = classrooms.find((item) => item.id === classroomId);
  if (!classroom) notFound();
  const records = await getClassroomGuardianPrintData(classroomId);
  if (records.length === 0) redirect("/dashboard/line/report");
  const qrDataUrl = await QRCode.toDataURL(oaUrl.toString(), { width: 280, margin: 1, errorCorrectionLevel: "M", color: { dark: "#18324c", light: "#ffffff" } });

  return <LinePrintSheet classroomId={classroom.id} classroom={classroom.code} oaUrl={oaUrl.toString()} qrDataUrl={qrDataUrl} records={records} />;
}

function safeLineOaUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["line.me", "www.line.me", "lin.ee"].includes(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}
