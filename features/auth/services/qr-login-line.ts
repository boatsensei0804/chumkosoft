import "server-only";

import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { replyText } from "@/lib/line";
import { approveQrLogin } from "@/features/auth/services/qr-login";

/** A LINE message approves a browser challenge only for one linked, active staff account. */
export async function handleQrLoginLineMessage(lineUserId: string, text: string, replyToken: string): Promise<boolean> {
  const match = /^LOGIN\s+([A-F0-9]{16})$/i.exec(text.trim());
  if (!match) return false;
  const key = createHash("sha256").update(lineUserId).digest("hex");
  if (!(await rateLimit(`qr-login-line:${key}`, 5, 60)).ok) return true;

  const staff = await prisma.staff.findMany({
    where: { lineUserId, isDeleted: false },
    take: 2,
    select: { user: { select: { id: true, role: true, isActive: true, isDeleted: true } } },
  });
  const user = staff.length === 1 ? staff[0].user : null;
  if (!user || !user.isActive || user.isDeleted || !["ADMIN", "TEACHER"].includes(user.role)) {
    await replyText(replyToken, "LINE นี้ยังไม่ได้ผูกกับบัญชีครูหรือเจ้าหน้าที่ที่ใช้งานได้ กรุณาติดต่อผู้ดูแลระบบ");
    return true;
  }
  const approved = await approveQrLogin(match[1].toUpperCase(), user.id, lineUserId);
  await replyText(replyToken, approved
    ? "ยืนยันเข้าสู่ระบบแล้ว ✅ กลับไปที่หน้าเว็บที่แสดง QR เพื่อใช้งาน"
    : "รหัส QR หมดอายุหรือใช้ไปแล้ว กรุณาสร้าง QR ใหม่บนหน้าเว็บ");
  return true;
}
