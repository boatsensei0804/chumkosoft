import { createHash } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getActiveKioskId } from "@/features/faces/services/scanner-api-auth";
import { reportScannerEmergency, SCANNER_EMERGENCY_CATEGORIES } from "@/features/faces/services/scanner-emergency";
import { rateLimit } from "@/lib/rate-limit";

const requestSchema = z.object({
  deviceId: z.string().uuid(),
  requestId: z.string().uuid(),
  category: z.enum(SCANNER_EMERGENCY_CATEGORIES),
  detail: z.string().trim().max(300).default(""),
}).strict();

export async function POST(request: Request): Promise<Response> {
  const kioskId = await getActiveKioskId();
  if (!kioskId) return Response.json({ ok: false, message: "กรุณาเชื่อมบัญชีจุดสแกน" }, { status: 401 });
  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > 2048)) {
    return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 2048) {
      return Response.json({ ok: false, message: "ข้อมูลมีขนาดใหญ่เกินไป" }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, message: "กรุณาตรวจสอบข้อมูลแจ้งเหตุ" }, { status: 400 });

  const device = await prisma.scannerDevice.findFirst({
    where: { removedAt: null, id: parsed.data.deviceId, kioskUserId: kioskId },
    select: { id: true },
  });
  if (!device) return Response.json({ ok: false, message: "เครื่องนี้ยังไม่ได้ผูกบัญชี" }, { status: 404 });
  const previous = await prisma.emergencyIncident.findUnique({ where: { requestId: parsed.data.requestId } });
  if (previous) {
    if (previous.deviceId !== device.id || previous.reportedByKioskId !== kioskId) {
      return Response.json({ ok: false, message: "รหัสคำขอนี้ถูกใช้แล้ว" }, { status: 409 });
    }
    return Response.json({ ok: true, incidentId: previous.id, duplicate: true, targetCount: previous.lineTargetCount, acceptedCount: previous.lineAcceptedCount, failedCount: previous.lineFailedCount, message: "ระบบรับแจ้งเหตุนี้ไว้แล้ว" }, { headers: { "Cache-Control": "no-store" } });
  }
  const key = createHash("sha256").update(device.id).digest("hex");
  const limited = await rateLimit(`scanner-emergency:${key}`, 5, 60);
  if (!limited.ok) return Response.json({ ok: false, message: "แจ้งเหตุซ้ำถี่เกินไป กรุณาติดต่อเจ้าหน้าที่โดยตรง" }, { status: 429 });

  try {
    const result = await reportScannerEmergency({ kioskId, ...parsed.data });
    const message = result.targetCount === 0
      ? "บันทึกเหตุแล้ว แต่ยังไม่มีบัญชี LINE ของแอดมิน/ครูที่เชื่อมไว้"
      : result.failedCount > 0
        ? `บันทึกเหตุแล้ว · LINE รับคำขอส่ง ${result.acceptedCount}/${result.targetCount} บัญชี กรุณาแจ้งผู้รับผิดชอบผ่านช่องทางสำรอง`
        : `บันทึกเหตุแล้ว · LINE รับคำขอส่งถึงแอดมิน/ครู ${result.acceptedCount} บัญชี`;
    return Response.json({ ok: true, incidentId: result.incidentId, duplicate: result.duplicate, targetCount: result.targetCount, acceptedCount: result.acceptedCount, failedCount: result.failedCount, message }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[scanner emergency] failed to create incident", error);
    return Response.json({ ok: false, message: "บันทึกเหตุไม่สำเร็จ กรุณาติดต่อเจ้าหน้าที่ผ่านช่องทางฉุกเฉินสำรอง" }, { status: 500 });
  }
}
