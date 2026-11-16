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
  const [accepted, failed, failedRecent] = await Promise.all([
    prisma.lineOutboundMessage.count({ where: { status: "ACCEPTED", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    prisma.lineOutboundMessage.count({ where: { status: "FAILED" } }),
    prisma.lineOutboundMessage.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return { configured: true, quota: quota.value as number, used: usage.totalUsage as number, accepted, failed, failedRecent, error: null };
}

export async function retryFailedLineDelivery(id: string) {
  const row = await prisma.lineOutboundMessage.findUnique({ where: { id } });
  if (!row || row.status !== "FAILED") return { ok: false, message: "รายการนี้ไม่อยู่ในสถานะส่งไม่สำเร็จ" };
  const { isLinePushEnabled } = await import("@/features/line/services/line-delivery-settings");
  if (!(await isLinePushEnabled())) return { ok: false, message: "กำลังพักการส่ง LINE อยู่" };
  const { sendLineTextToUsers } = await import("@/lib/line");
  const { randomUUID } = await import("node:crypto");
  const key = randomUUID();
  const result = await sendLineTextToUsers([row.recipientId], row.body, key);
  await prisma.lineOutboundMessage.create({ data: { kind: row.kind, title: row.title, body: row.body, recipientId: row.recipientId, recipientLabel: row.recipientLabel, status: result.accepted ? "ACCEPTED" : "FAILED", errorCode: result.accepted ? null : result.code, retryKey: key } });
  return { ok: result.accepted, message: result.accepted ? "LINE รับคำขอส่งซ้ำแล้ว" : `ส่งไม่สำเร็จ (${result.code})` };
}
