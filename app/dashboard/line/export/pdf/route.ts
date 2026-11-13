import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { getClassroomGuardianPrintData, listGuardianClassrooms } from "@/features/guardians/services/guardian-service";
import { createLinePrintPdf } from "@/features/line/services/line-print-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeLineOaUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["line.me", "www.line.me", "lin.ee"].includes(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  await requireRoles(STAFF_ROLES);
  const oaUrl = safeLineOaUrl(new URL(request.url).searchParams.get("oa"));
  if (!oaUrl) return new Response("Invalid LINE OA URL", { status: 400 });

  const classrooms = await listGuardianClassrooms();
  if (classrooms.length === 0) return new Response("No classrooms", { status: 404 });
  const rooms = [];
  for (const classroom of classrooms) {
    rooms.push({ classroom: classroom.code, records: await getClassroomGuardianPrintData(classroom.id) });
  }
  const pdf = await createLinePrintPdf(rooms, oaUrl.toString());
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="chumkosoft-line-codes-all-classrooms.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
