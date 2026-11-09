import prisma from "@/lib/prisma";
import { getActiveKioskId } from "@/features/faces/services/scanner-api-auth";

const PAGE_SIZE = 200;

/** Minimal consented roster for desktop face enrollment. */
export async function GET(request: Request): Promise<Response> {
  const actorId = await getActiveKioskId();
  if (!actorId) {
    return Response.json({ ok: false, message: "กรุณาเข้าสู่ระบบจุดสแกน" }, { status: 401 });
  }

  const pageText = new URL(request.url).searchParams.get("page") ?? "0";
  const page = Number(pageText);
  if (!/^\d+$/.test(pageText) || !Number.isSafeInteger(page) || page > 49) {
    return Response.json({ ok: false, message: "หน้ารายชื่อไม่ถูกต้อง" }, { status: 400 });
  }

  const term = await prisma.term.findFirst({
    where: { isActive: true, isDeleted: false },
    select: { id: true },
  });
  if (!term) {
    return Response.json({ ok: true, students: [], hasMore: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const rows = await prisma.student.findMany({
    where: {
      isDeleted: false,
      faceConsent: true,
      enrollments: { some: { termId: term.id, status: "ACTIVE", isDeleted: false } },
    },
    orderBy: { studentCode: "asc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: {
      studentCode: true,
      prefix: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { termId: term.id, status: "ACTIVE", isDeleted: false },
        select: { classroom: { select: { code: true } } },
        take: 1,
      },
    },
  });
  const students = rows.slice(0, PAGE_SIZE).map((student) => ({
    code: student.studentCode,
    name: [student.prefix, student.firstName, student.lastName].filter(Boolean).join(" "),
    classroom: student.enrollments[0]?.classroom.code ?? "—",
  }));
  return Response.json(
    { ok: true, students, hasMore: rows.length > PAGE_SIZE },
    { headers: { "Cache-Control": "no-store" } },
  );
}
