import "server-only";
import prisma from "@/lib/prisma";

export async function getLineApiSummary() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { configured: false, quota: null, used: null, error: "ยังไม่ได้ตั้งค่า LINE" };
  const headers = { Authorization: `Bearer ${token}` };
  const [quotaRes, usageRes] = await Promise.all([
    fetch("https://api.line.me/v2/bot/message/quota", { headers, cache: "no-store", signal: AbortSignal.timeout(8000) }),
    fetch("https://api.line.me/v2/bot/message/quota/consumption", { headers, cache: "no-store", signal: AbortSignal.timeout(8000) }),
  ]);
  if (!quotaRes.ok || !usageRes.ok) return { configured: true, quota: null, used: null, error: `LINE API ตอบกลับ ${!quotaRes.ok ? quotaRes.status : usageRes.status}` };
  const [quota, usage] = await Promise.all([quotaRes.json(), usageRes.json()]);
  const [accepted, failed, failedRecent, announcements] = await Promise.all([
    prisma.lineOutboundMessage.count({ where: { status: "ACCEPTED", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    prisma.lineOutboundMessage.count({ where: { status: "FAILED" } }),
    prisma.lineOutboundMessage.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.lineAnnouncement.findMany({ where: { isDeleted: false }, orderBy: { createdAt: "desc" }, take: 100, include: { batches: { select: { status: true, recipientCount: true, errorCode: true } } } }),
  ]);
  const byDay = await prisma.lineOutboundMessage.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }, select: { createdAt: true, kind: true, status: true }, orderBy: { createdAt: "desc" }, take: 2000 });
  return { configured: true, quota: quota.value as number, used: usage.totalUsage as number, accepted, failed, failedRecent, announcements, byDay, error: null };
}

export async function retryFailedLineDelivery(id: string) {
  const row = await prisma.lineOutboundMessage.findUnique({ where: { id } });
  if (!row || row.status !== "FAILED") return { ok: false, message: "รายการนี้ไม่อยู่ในสถานะส่งไม่สำเร็จ" };
  if (Date.now() - row.createdAt.getTime() > 24 * 60 * 60 * 1000) return { ok: false, message: "LINE retry key มีอายุ 24 ชั่วโมง กรุณาสร้างข้อความใหม่แทนการส่งซ้ำรายการเก่า" };
  const { isLinePushEnabled } = await import("@/features/line/services/line-delivery-settings");
  if (!(await isLinePushEnabled())) return { ok: false, message: "กำลังพักการส่ง LINE อยู่" };
  const { sendLineTextToUsers } = await import("@/lib/line");
  const result = await sendLineTextToUsers([row.recipientId], row.body, row.retryKey);
  await prisma.lineOutboundMessage.update({ where: { id }, data: { status: result.accepted ? "ACCEPTED" : "FAILED", errorCode: result.accepted ? null : result.code, attempts: { increment: 1 }, requestId: result.requestId, acceptedRequestId: result.acceptedRequestId } });
  if (row.emergencyIncidentId) {
    const [acceptedCount, failedCount] = await Promise.all([
      prisma.lineOutboundMessage.count({ where: { emergencyIncidentId: row.emergencyIncidentId, status: "ACCEPTED" } }),
      prisma.lineOutboundMessage.count({ where: { emergencyIncidentId: row.emergencyIncidentId, status: "FAILED" } }),
    ]);
    await prisma.emergencyIncident.update({ where: { id: row.emergencyIncidentId }, data: { lineAcceptedCount: acceptedCount, lineFailedCount: failedCount } });
  }
  return { ok: result.accepted, message: result.accepted ? result.code === "HTTP_409" ? "LINE ยืนยันว่าคำขอเดิมถูกรับแล้ว ไม่ส่งข้อความซ้ำ" : "LINE รับคำขอส่งแล้ว (ยืนยันการรับคำขอจาก API)" : `LINE ไม่รับคำขอ (${result.code})` };
}
