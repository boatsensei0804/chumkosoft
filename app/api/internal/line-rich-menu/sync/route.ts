import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyTeacherMenuSync } from "@/features/line/teacher-menu-sync-auth";
import { linkTeacherRichMenu, teacherRichMenuId, unlinkTeacherRichMenu } from "@/features/line/services/teacher-rich-menu";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!verifyTeacherMenuSync(
    process.env.LINE_CHANNEL_ACCESS_TOKEN,
    request.headers.get("x-chumkosoft-timestamp"),
    request.headers.get("x-chumkosoft-signature"),
  )) return new NextResponse("unauthorized", { status: 401 });

  const menuId = await teacherRichMenuId();
  if (!menuId) return new NextResponse("teacher rich menu not published", { status: 503 });

  const staff = await prisma.staff.findMany({
    where: { lineUserId: { not: null } },
    select: { lineUserId: true, isDeleted: true, user: { select: { role: true, isActive: true, isDeleted: true } } },
  });
  const active = new Set(staff.filter((person) => !person.isDeleted && person.user?.role === "TEACHER" && person.user.isActive && !person.user.isDeleted).flatMap((person) => person.lineUserId ? [person.lineUserId] : []));
  const all = new Set(staff.flatMap((person) => person.lineUserId ? [person.lineUserId] : []));
  let linked = 0;
  let unlinked = 0;
  let failed = 0;
  const ids = [...all];
  for (let index = 0; index < ids.length; index += 10) {
    await Promise.all(ids.slice(index, index + 10).map(async (lineUserId) => {
      try {
        if (active.has(lineUserId)) {
          if (await linkTeacherRichMenu(lineUserId, menuId)) linked += 1;
          else failed += 1;
        } else if (await unlinkTeacherRichMenu(lineUserId, menuId)) unlinked += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }));
  }
  return NextResponse.json({ linked, unlinked, failed }, { status: failed ? 503 : 200 });
}
