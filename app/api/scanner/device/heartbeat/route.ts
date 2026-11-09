import { z } from "zod";
import prisma from "@/lib/prisma";
import { getScanSetting } from "@/features/kiosk/repositories/kiosk-repository";
import { getActiveKioskId } from "@/features/faces/services/scanner-api-auth";

const heartbeatSchema = z.object({
  deviceId: z.string().uuid(),
  pendingCount: z.number().int().min(0).max(100_000),
  cameraActive: z.boolean(),
  modelVersion: z.string().min(1).max(64),
}).strict();

export async function POST(request: Request): Promise<Response> {
  const kioskId = await getActiveKioskId();
  if (!kioskId) return Response.json({ ok: false, message: "กรุณาเชื่อมบัญชีจุดสแกน" }, { status: 401 });
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length < 1 || length > 1024) {
    return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const updated = await prisma.scannerDevice.updateMany({
    where: { id: parsed.data.deviceId, kioskUserId: kioskId },
    data: {
      lastSeenAt: new Date(), pendingCount: parsed.data.pendingCount,
      cameraActive: parsed.data.cameraActive, modelVersion: parsed.data.modelVersion,
    },
  });
  if (!updated.count) return Response.json({ ok: false, message: "เครื่องนี้ยังไม่ได้ผูกบัญชี" }, { status: 404 });
  const [device, scanWindow] = await Promise.all([
    prisma.scannerDevice.findUniqueOrThrow({
      where: { id: parsed.data.deviceId },
      select: { cameraIndex: true, detectionIntervalSeconds: true, repeatCooldownSeconds: true },
    }),
    getScanSetting(),
  ]);
  return Response.json({ ok: true, settings: { ...device, ...scanWindow } }, {
    headers: { "Cache-Control": "no-store" },
  });
}
