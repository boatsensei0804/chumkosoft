import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSession, decryptSession, getSessionToken } from "@/lib/session";
import { homePathForRole } from "@/features/auth/roles";
import { claimQrLogin } from "@/features/auth/services/qr-login";
import { isAllowedQrLoginOrigin } from "@/features/auth/services/qr-login-origin";

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedQrLoginOrigin(request)) {
    return Response.json({ ok: false, message: "คำขอจากเว็บไซต์ไม่ถูกต้อง" }, { status: 403 });
  }
  if (await decryptSession(await getSessionToken())) {
    return Response.json({ ok: false, message: "เข้าสู่ระบบอยู่แล้ว" }, { status: 409 });
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("qr_login_browser")?.value;
  const result = await claimQrLogin(token ?? "");
  if (result.state === "pending") {
    return Response.json({ ok: true, state: "pending" }, { headers: { "Cache-Control": "no-store" } });
  }
  if (result.state !== "approved" || !result.userId || !result.lineUserId) {
    return Response.json({ ok: false, state: "expired", message: "QR หมดอายุแล้ว กรุณาสร้างใหม่" }, { status: 410 });
  }
  const user = await prisma.user.findFirst({
    where: { id: result.userId, isActive: true, isDeleted: false, role: { in: ["ADMIN", "TEACHER"] }, staff: { is: { isDeleted: false, lineUserId: result.lineUserId } } },
    select: { id: true, role: true },
  });
  if (!user) {
    return Response.json({ ok: false, message: "บัญชีนี้ใช้งานไม่ได้" }, { status: 403 });
  }
  if (user.role === "KIOSK") await createSession(user.id, user.role, true);
  await createSession(user.id, user.role);
  cookieStore.set("qr_login_browser", "", { expires: new Date(0), path: "/api/auth/qr" });
  return NextResponse.json({ ok: true, state: "approved", redirectTo: homePathForRole(user.role) }, {
    headers: { "Cache-Control": "no-store" },
  });
}
