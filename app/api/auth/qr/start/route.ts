import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { QR_LOGIN_SECONDS, startQrLogin } from "@/features/auth/services/qr-login";
import { isAllowedQrLoginOrigin } from "@/features/auth/services/qr-login-origin";

const QR_COOKIE = "qr_login_browser";

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedQrLoginOrigin(request)) {
    return Response.json({ ok: false, message: "คำขอจากเว็บไซต์ไม่ถูกต้อง" }, { status: 403 });
  }
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!(await rateLimit(`qr-login-start:${ip}`, 6, 60)).ok) {
    return Response.json({ ok: false, message: "สร้าง QR บ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  }
  const lineId = process.env.LINE_OA_BASIC_ID?.trim() || "@089fdgbv";
  if (!/^@[A-Za-z0-9._-]{4,32}$/.test(lineId)) {
    return Response.json({ ok: false, message: "ยังไม่ได้ตั้งค่า LINE OA สำหรับเข้าสู่ระบบ" }, { status: 503 });
  }
  const challenge = await startQrLogin();
  if (!challenge) {
    return Response.json({ ok: false, message: "ระบบ QR ยังไม่พร้อม กรุณาตรวจ Redis" }, { status: 503 });
  }
  const message = `LOGIN ${challenge.code}`;
  const lineUrl = `https://line.me/R/oaMessage/${encodeURIComponent(lineId)}/?${encodeURIComponent(message)}`;
  const qrDataUrl = await QRCode.toDataURL(lineUrl, { width: 300, margin: 2, errorCorrectionLevel: "M" });
  const response = NextResponse.json({ ok: true, code: challenge.code, qrDataUrl, lineUrl, expiresIn: QR_LOGIN_SECONDS }, {
    headers: { "Cache-Control": "no-store" },
  });
  response.cookies.set(QR_COOKIE, challenge.browserToken, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
    maxAge: QR_LOGIN_SECONDS, path: "/api/auth/qr",
  });
  return response;
}
