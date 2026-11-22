import { requireRoles } from "@/lib/dal";
import { advisoryClassroomIds } from "@/lib/teacher-data-access";
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
  const user = await requireRoles(STAFF_ROLES);
  const params = new URL(request.url).searchParams;
  const oaUrl = safeLineOaUrl(params.get("oa"));
  const selectedId = params.get("classroom");
  if (!oaUrl) return new Response("Invalid LINE OA URL", { status: 400 });

  const teacherRooms = user.role === "ADMIN" ? null : new Set(await advisoryClassroomIds(user));
  const classrooms = (await listGuardianClassrooms()).filter((room) =>
    (!teacherRooms || teacherRooms.has(room.id)) && (!selectedId || selectedId === room.id),
  );
  if (classrooms.length === 0) return new Response("No classrooms", { status: 404 });
  const rooms = [];
  for (const classroom of classrooms) {
    rooms.push({ classroom: classroom.code, records: await getClassroomGuardianPrintData(classroom.id) });
  }
  const pdf = await createLinePrintPdf(rooms, oaUrl.toString());
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="chumkosoft-line-codes.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
