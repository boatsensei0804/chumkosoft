import "server-only";

import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { sendLineTextToUsers } from "@/lib/line";
import { logAudit } from "@/lib/audit";

export const SCANNER_EMERGENCY_CATEGORIES = ["MEDICAL", "FIRE", "SECURITY", "OTHER"] as const;
export type ScannerEmergencyCategory = typeof SCANNER_EMERGENCY_CATEGORIES[number];

const CATEGORY_LABELS: Record<ScannerEmergencyCategory, string> = {
  MEDICAL: "เจ็บป่วย/บาดเจ็บ",
  FIRE: "ไฟไหม้/ควัน",
  SECURITY: "ความปลอดภัย",
  OTHER: "เหตุฉุกเฉินอื่น ๆ",
};

async function mapWithConcurrency<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await work(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function reportScannerEmergency(input: {
  kioskId: string;
  deviceId: string;
  requestId: string;
  category: ScannerEmergencyCategory;
  detail: string;
}): Promise<{ incidentId: string; duplicate: boolean; targetCount: number; acceptedCount: number; failedCount: number }> {
  const previous = await prisma.emergencyIncident.findUnique({ where: { requestId: input.requestId } });
  if (previous) {
    if (previous.deviceId !== input.deviceId || previous.reportedByKioskId !== input.kioskId) throw new Error("EMERGENCY_REQUEST_CONFLICT");
    return { incidentId: previous.id, duplicate: true, targetCount: previous.lineTargetCount, acceptedCount: previous.lineAcceptedCount, failedCount: previous.lineFailedCount };
  }

  const device = await prisma.scannerDevice.findFirst({
    where: { removedAt: null, id: input.deviceId, kioskUserId: input.kioskId },
    select: { id: true, name: true },
  });
  if (!device) throw new Error("SCANNER_DEVICE_NOT_FOUND");

  let incident;
  try {
    incident = await prisma.emergencyIncident.create({
      data: {
        requestId: input.requestId,
        deviceId: device.id,
        deviceNameSnapshot: device.name,
        reportedByKioskId: input.kioskId,
        category: CATEGORY_LABELS[input.category],
        detail: input.detail.trim() || null,
      },
      select: { id: true, createdAt: true },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const raced = await prisma.emergencyIncident.findUnique({ where: { requestId: input.requestId } });
      if (raced?.deviceId === input.deviceId && raced.reportedByKioskId === input.kioskId) {
        return { incidentId: raced.id, duplicate: true, targetCount: raced.lineTargetCount, acceptedCount: raced.lineAcceptedCount, failedCount: raced.lineFailedCount };
      }
    }
    throw error;
  }

  const recipients = await prisma.staff.findMany({
    where: {
      isDeleted: false,
      lineUserId: { not: null },
      user: { is: { role: { in: ["ADMIN", "TEACHER"] }, isActive: true, isDeleted: false } },
    },
    select: { lineUserId: true, firstName: true, lastName: true },
  });
  const recipientMap = new Map<string, string>();
  for (const row of recipients) if (row.lineUserId) recipientMap.set(row.lineUserId, `${row.firstName} ${row.lastName}`);
  const uniqueRecipients = [...recipientMap].map(([id, name]) => ({ id, name }));
  const localTime = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(incident.createdAt);
  const body = `🚨 แจ้งเหตุฉุกเฉินจากจุดสแกน\nอุปกรณ์: ${device.name}\nประเภท: ${CATEGORY_LABELS[input.category]}${input.detail.trim() ? `\nรายละเอียด: ${input.detail.trim()}` : ""}\nเวลา: ${localTime}\nติดตามสถานะ: https://chumkosoft.com/dashboard/emergencies`;
  const attempts = uniqueRecipients.map((recipient) => ({
    recipient,
    retryKey: randomUUID(),
    title: `เหตุฉุกเฉิน · ${device.name}`,
  }));
  if (attempts.length) {
    await prisma.lineOutboundMessage.createMany({
      data: attempts.map(({ recipient, retryKey, title }) => ({
        kind: "EMERGENCY",
        title,
        body,
        recipientId: recipient.id,
        recipientLabel: recipient.name,
        status: "FAILED" as const,
        errorCode: "PENDING",
        retryKey,
        emergencyIncidentId: incident.id,
      })),
    });
  }
  const deliveries = await mapWithConcurrency(attempts, 8, async ({ recipient, retryKey }) => {
    const result = await sendLineTextToUsers([recipient.id], body, retryKey);
    return prisma.lineOutboundMessage.update({
      where: { retryKey },
      data: {
        status: result.accepted ? "ACCEPTED" : "FAILED",
        errorCode: result.accepted ? null : result.code,
        requestId: result.requestId,
        acceptedRequestId: result.acceptedRequestId,
      },
      select: { status: true },
    });
  });
  const acceptedCount = deliveries.filter((row) => row.status === "ACCEPTED").length;
  const failedCount = deliveries.length - acceptedCount;
  await prisma.emergencyIncident.update({
    where: { id: incident.id },
    data: { lineTargetCount: uniqueRecipients.length, lineAcceptedCount: acceptedCount, lineFailedCount: failedCount },
  });
  await logAudit({ actorId: input.kioskId, action: "scanner.emergency.report", targetType: "emergencyIncident", targetId: incident.id, detail: `${CATEGORY_LABELS[input.category]} · ${device.name}` });
  return { incidentId: incident.id, duplicate: false, targetCount: uniqueRecipients.length, acceptedCount, failedCount };
}
