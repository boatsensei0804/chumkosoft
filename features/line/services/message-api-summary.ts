import "server-only";
import prisma from "@/lib/prisma";

async function getLineQuota(): Promise<{ quota: number | null; used: number | null; error: string | null }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { quota: null, used: null, error: "ยังไม่ได้ตั้งค่า LINE" };
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const [quotaRes, usageRes] = await Promise.all([
      fetch("https://api.line.me/v2/bot/message/quota", { headers, cache: "no-store", signal: AbortSignal.timeout(8000) }),
      fetch("https://api.line.me/v2/bot/message/quota/consumption", { headers, cache: "no-store", signal: AbortSignal.timeout(8000) }),
    ]);
    if (!quotaRes.ok || !usageRes.ok) return { quota: null, used: null, error: `LINE API ตอบกลับ ${!quotaRes.ok ? quotaRes.status : usageRes.status}` };
    const [quota, usage] = await Promise.all([quotaRes.json(), usageRes.json()]);
    return { quota: quota.value ?? null, used: usage.totalUsage ?? null, error: null };
  } catch {
    return { quota: null, used: null, error: "อ่านโควตาจาก LINE ไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function getLineApiSummary(filters: { kind?: string; status?: string; date?: string }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00+07:00`);
  const rangeStart = new Date(`${today}T00:00:00+07:00`);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 29);
  const dayStart = filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)
    ? new Date(`${filters.date}T00:00:00+07:00`)
    : null;
  const validDay = dayStart && Number.isFinite(dayStart.getTime());
  const [quota, accepted, failed, recent, announcements, byDay] = await Promise.all([
    getLineQuota(),
    prisma.lineOutboundMessage.count({ where: { status: "ACCEPTED", createdAt: { gte: monthStart } } }),
    prisma.lineOutboundMessage.count({ where: { status: "FAILED" } }),
    prisma.lineOutboundMessage.findMany({
      where: {
        ...(filters.kind === "ATTENDANCE" || filters.kind === "TEACHER_DIGEST" ? { kind: filters.kind } : {}),
        ...(filters.status === "ACCEPTED" || filters.status === "FAILED" ? { status: filters.status } : {}),
        ...(validDay ? { createdAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 86400000) } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: { id: true, title: true, kind: true, status: true, recipientLabel: true, createdAt: true, updatedAt: true, errorCode: true, attempts: true, requestId: true, acceptedRequestId: true },
    }),
    prisma.lineAnnouncement.findMany({ where: { isDeleted: false }, orderBy: { createdAt: "desc" }, take: 100, include: { batches: { select: { status: true, recipientCount: true, errorCode: true } } } }),
    prisma.lineOutboundMessage.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true, kind: true, status: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return { ...quota, accepted, failed, recent, announcements, byDay };
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
