import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { DEVICE_CODE_PATTERN, pollScannerPairing } from "@/features/faces/services/scanner-pairing";

export async function POST(request: Request): Promise<Response> {
  const size = Number(request.headers.get("content-length"));
  if (!Number.isFinite(size) || size < 1 || size > 256) {
    return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const deviceCode = (body as { deviceCode?: unknown } | null)?.deviceCode;
  if (typeof deviceCode !== "string" || !DEVICE_CODE_PATTERN.test(deviceCode)) {
    return Response.json({ ok: false, message: "รหัสเชื่อมต่อไม่ถูกต้อง" }, { status: 400 });
  }
  const requestedDeviceId = (body as { deviceId?: unknown } | null)?.deviceId;
  const parsedDeviceId = requestedDeviceId === undefined ? null : z.string().uuid().safeParse(requestedDeviceId);
  if (parsedDeviceId && !parsedDeviceId.success) {
    return Response.json({ ok: false, message: "รหัสเครื่องไม่ถูกต้อง" }, { status: 400 });
  }
  const codeHash = createHash("sha256").update(deviceCode).digest("hex");
  const limited = await rateLimit(`scanner-pair-poll:${codeHash}`, 20, 60);
  if (!limited.ok) {
    return Response.json({ ok: false, message: "ตรวจสถานะบ่อยเกินไป" }, { status: 429 });
  }

  const result = await pollScannerPairing(deviceCode);
  if (result.state === "expired") {
    return Response.json({ ok: false, message: "QR หมดอายุแล้ว กรุณาสร้างใหม่" }, { status: 410 });
  }
  if (result.state === "pending") {
    return Response.json({ ok: true, state: "pending" }, { headers: { "Cache-Control": "no-store" } });
  }
  const user = await prisma.user.findFirst({
    where: { id: result.kioskId, role: "KIOSK", isActive: true, isDeleted: false },
    select: { id: true },
  });
  if (!user) {
    return Response.json({ ok: false, message: "บัญชีจุดสแกนนี้ใช้งานไม่ได้" }, { status: 403 });
  }
  const deviceId = parsedDeviceId?.success ? parsedDeviceId.data : randomUUID();
  const existingDevice = await prisma.scannerDevice.findUnique({
    where: { id: deviceId }, select: { kioskUserId: true },
  });
  if (existingDevice && existingDevice.kioskUserId !== user.id) {
    return Response.json({ ok: false, message: "เครื่องนี้ผูกกับบัญชีจุดสแกนอื่นอยู่" }, { status: 409 });
  }
  if (existingDevice) {
    await prisma.scannerDevice.updateMany({
      where: { id: deviceId, kioskUserId: user.id }, data: { lastSeenAt: new Date() },
    });
  } else {
    try {
      await prisma.scannerDevice.create({ data: { id: deviceId, kioskUserId: user.id, lastSeenAt: new Date() } });
    } catch {
      return Response.json({ ok: false, message: "รหัสเครื่องนี้ถูกใช้งานแล้ว กรุณาลองใหม่" }, { status: 409 });
    }
  }
  await createSession(user.id, "KIOSK");
  return Response.json({ ok: true, state: "approved", deviceId }, { headers: { "Cache-Control": "no-store" } });
}
