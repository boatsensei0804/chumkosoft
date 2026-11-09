import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { getActiveKioskId } from "@/features/faces/services/scanner-api-auth";
import { processScannerBatch, scannerBatchSchema } from "@/features/faces/services/scanner-sync";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request): Promise<Response> {
  const kioskId = await getActiveKioskId();
  if (!kioskId) return Response.json({ ok: false, message: "กรุณาเชื่อมบัญชีจุดสแกน" }, { status: 401 });
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length < 1 || length > 16 * 1024) {
    return Response.json({ ok: false, message: "ชุดข้อมูลใหญ่เกินไป" }, { status: 413 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const parsed = scannerBatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const device = await prisma.scannerDevice.findFirst({
    where: { id: parsed.data.deviceId, kioskUserId: kioskId }, select: { id: true },
  });
  if (!device) return Response.json({ ok: false, message: "เครื่องนี้ยังไม่ได้ผูกบัญชี" }, { status: 404 });
  const key = createHash("sha256").update(device.id).digest("hex");
  const limited = await rateLimit(`scanner-events:${key}`, 15, 60);
  if (!limited.ok) return Response.json({ ok: false, message: "ส่งข้อมูลถี่เกินไป" }, { status: 429 });
  const outcomes = await processScannerBatch(device.id, parsed.data.events);
  await prisma.scannerDevice.updateMany({
    where: { id: device.id, kioskUserId: kioskId }, data: { lastSeenAt: new Date(), lastSyncAt: new Date() },
  });
  return Response.json({ ok: true, ...outcomes }, { headers: { "Cache-Control": "no-store" } });
}
