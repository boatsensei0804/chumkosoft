import QRCode from "qrcode";
import { cookies } from "next/headers";
import { isAllowedQrLoginOrigin } from "@/features/auth/services/qr-login-origin";
import { PAIRING_SECONDS, pollScannerPairing, startScannerPairing } from "@/features/faces/services/scanner-pairing";
import { createSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";

const cookie = "display_qr_browser";
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  if (!isAllowedQrLoginOrigin(request)) return new Response(null, {status: 403});
  const { action } = await context.params;
  const jar = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/kiosk/qr" } as const;
  if (action === "start") {
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "unknown";
    if (!(await rateLimit(`display-qr-start:${ip}`, 6, 60)).ok) return Response.json({message: "กรุณารอสักครู่ก่อนสร้าง QR ใหม่"}, {status: 429});
    const pairing = await startScannerPairing("display");
    if (!pairing) return Response.json({message: "สร้าง QR ไม่สำเร็จ กรุณาลองใหม่หรือใช้รหัสผ่าน"}, {status: 503});
    const url = new URL(`/kiosk/confirm/${pairing.userCode}`, request.headers.get("origin")!);
    const qrDataUrl = await QRCode.toDataURL(url.href, { width: 300, margin: 4 });
    jar.set(cookie, pairing.deviceCode, {...options, maxAge: PAIRING_SECONDS});
    return Response.json({ok: true, code: pairing.userCode, qrDataUrl, expiresIn: PAIRING_SECONDS}, {headers});
  }
  if (action !== "claim") return new Response(null, {status: 404});
  const claim = await pollScannerPairing(jar.get(cookie)?.value ?? "", "display");
  if (claim.state === "pending") return Response.json({state: "pending"}, {headers});
  if (claim.state !== "approved" || !claim.kioskId) return Response.json({message: "QR หมดอายุแล้ว กรุณาสร้างใหม่"}, {status: 410, headers});
  const kiosk = await prisma.user.findFirst({where: {id: claim.kioskId, role: "KIOSK", isActive: true, isDeleted: false}, select: {id: true}});
  if (!kiosk) return Response.json({message: "บัญชีจุดสแกนถูกปิดใช้งาน"}, {status: 403, headers});
  await createSession(kiosk.id, "KIOSK", true);
  jar.set(cookie, "", {...options, maxAge: 0});
  return Response.json({state: "approved", redirectTo: "/scan"}, {headers});
}
