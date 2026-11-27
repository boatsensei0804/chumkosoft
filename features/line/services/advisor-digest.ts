import "server-only";

import { createHash } from "node:crypto";
import { once } from "node:events";
import prisma from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { sendLineTextToUsers } from "@/lib/line";
import { getSchoolEntryRoster, listEntryClassrooms } from "@/features/attendance/services/school-entry-service";
import { isLinePushEnabled } from "@/features/line/services/line-delivery-settings";
import { formatBangkokTime } from "@/utils/thai-date";

const bangkokDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
const SENT_TTL_SECONDS = 36 * 60 * 60;

function getDigestRetryKey(key: string, recipientId: string): string {
  const bytes = createHash("sha256").update(JSON.stringify([key, recipientId])).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function sendAdvisorDigests(): Promise<{ sent: number; failed: number }> {
  const now = new Date();
  const date = bangkokDate.format(now);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (day === 0 || day === 6) return { sent: 0, failed: 0 };
  const setting = await prisma.advisorDigestSetting.findUnique({ where: { id: 1 }, select: { sendTime: true } });
  if (formatBangkokTime(now) < (setting?.sendTime ?? "09:00") || !(await isLinePushEnabled())) {
    return { sent: 0, failed: 0 };
  }
  const redis = getRedis();
  if (!redis) throw new Error("Redis is required for daily delivery control");
  if (redis.status !== "ready") await once(redis, "ready", { signal: AbortSignal.timeout(5000) });

  const advisors = await prisma.staff.findMany({
    where: { isDeleted: false, lineUserId: { not: null }, advisories: { some: { classroom: { isDeleted: false, academicYear: { isActive: true, isDeleted: false } } } } },
    select: { id: true, lineUserId: true },
  });
  let sent = 0;
  let failed = 0;
  for (const advisor of advisors) {
    if (!advisor.lineUserId) continue;
    const key = `advisor-digest:${date}:${advisor.id}`;
    const acquired = await redis.set(key, "sending", "EX", 5 * 60, "NX");
    if (acquired !== "OK") continue;
    try {
      const retryKey = getDigestRetryKey(key, advisor.lineUserId);
      const receipt = await prisma.lineOutboundMessage.findUnique({
        where: { retryKey }, select: { status: true, body: true },
      });
      if (receipt?.status === "ACCEPTED") {
        await redis.set(key, "sent", "EX", SENT_TTL_SECONDS);
        continue;
      }
      const message = receipt?.body ?? await buildDigest(date, advisor.id);
      if (!message) { await redis.del(key); continue; }
      const delivery = await sendLineTextToUsers([advisor.lineUserId], message, retryKey);
      const result = {
        status: delivery.accepted ? "ACCEPTED" as const : "FAILED" as const,
        errorCode: delivery.accepted ? null : delivery.code,
        requestId: delivery.requestId,
        acceptedRequestId: delivery.acceptedRequestId,
      };
      await prisma.lineOutboundMessage.upsert({
        where: { retryKey },
        create: { kind: "TEACHER_DIGEST", title: `สรุปเข้าเรียนครู · ${date}`, body: message, recipientId: advisor.lineUserId, retryKey, ...result },
        update: { ...result, attempts: { increment: 1 } },
      });
      if (!delivery.accepted) throw new Error("LINE push failed");
      await redis.set(key, "sent", "EX", SENT_TTL_SECONDS);
      sent += 1;
    } catch {
      await redis.del(key);
      failed += 1;
    }
  }
  return { sent, failed };
}

async function buildDigest(date: string, advisorId: string): Promise<string | null> {
  const [rooms, roster] = await Promise.all([listEntryClassrooms(advisorId), getSchoolEntryRoster(date, "", advisorId)]);
  if (!roster || rooms.length === 0) return null;
  const lines = rooms.map((room) => {
    const students = roster.students.filter((student) => student.classroomCode === room.code);
    const arrived = students.filter((student) => student.state !== "ABSENT");
    const late = arrived.filter((student) => student.isLate);
    const awaiting = students.filter((student) => student.state === "ABSENT");
    return `ห้อง ${room.code}: มาแล้ว ${arrived.length}/${students.length} · สาย ${late.length} · ยังไม่เข้า ${awaiting.length}${awaiting.length ? `\nยังไม่เข้า: ${awaiting.map((student) => student.name).join(", ")}` : ""}`;
  });
  return `สรุปการเข้าโรงเรียน ${date}\n${lines.join("\n\n")}\n\nดูรายละเอียด: https://chumkosoft.com/dashboard/attendance?mode=school&date=${date}`;
}
