import "server-only";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getScanSetting } from "@/features/kiosk/repositories/kiosk-repository";
import { syncLateBehaviorPoints } from "@/features/behavior/services/late-points";
import { notifyGuardiansOfCheckIn } from "@/features/line/services/line-service";

export const scannerEventSchema = z.object({
  eventId: z.string().uuid(),
  studentCode: z.string().min(1).max(80),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  capturedAt: z.string().datetime({ offset: true }),
}).strict();
export const scannerBatchSchema = z.object({
  deviceId: z.string().uuid(),
  events: z.array(scannerEventSchema).min(1).max(20),
}).strict();
type ScannerEvent = z.infer<typeof scannerEventSchema>;

const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false,
});

function isRetryable(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error.code === "P2002" || error.code === "P2034");
}

export type ScannerEventOutcome =
  | { eventId: string; accepted: true; result: "checked_in" | "already" }
  | { eventId: string; accepted: false; reason: string };

async function processOne(deviceId: string, event: ScannerEvent): Promise<ScannerEventOutcome> {
  const capturedAt = new Date(event.capturedAt);
  const now = new Date();
  if (!Number.isFinite(capturedAt.getTime()) || dateFormatter.format(capturedAt) !== event.localDate) {
    return { eventId: event.eventId, accepted: false, reason: "วันที่และเวลาในเครื่องไม่ตรงกัน" };
  }
  if (capturedAt.getTime() > now.getTime() + 5 * 60_000 ||
      capturedAt.getTime() < now.getTime() - 90 * 24 * 60 * 60_000) {
    return { eventId: event.eventId, accepted: false, reason: "เวลาเครื่องคลาดเคลื่อนหรือรายการเก่าเกิน 90 วัน" };
  }
  const existingEvent = await prisma.scannerSyncEvent.findUnique({
    where: { eventId: event.eventId }, select: { deviceId: true, studentId: true, result: true },
  });
  const student = await prisma.student.findFirst({
    where: { studentCode: event.studentCode, isDeleted: false },
    select: { id: true, prefix: true, firstName: true, lastName: true, faceConsent: true },
  });
  if (!student) return { eventId: event.eventId, accepted: false, reason: "ไม่พบนักเรียนในระบบ" };
  if (existingEvent) {
    return existingEvent.deviceId === deviceId && existingEvent.studentId === student.id
      ? existingEvent.result === "rejected"
        ? { eventId: event.eventId, accepted: false, reason: "รายการเช็กชื่อนี้ถูกยกเลิกในระบบ" }
        : { eventId: event.eventId, accepted: true, result: "already" }
      : { eventId: event.eventId, accepted: false, reason: "รหัสรายการนี้ถูกใช้กับข้อมูลอื่นแล้ว" };
  }
  if (!student.faceConsent) return { eventId: event.eventId, accepted: false, reason: "นักเรียนไม่ได้ยินยอมให้สแกนใบหน้า" };

  const date = new Date(`${event.localDate}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== event.localDate) {
    return { eventId: event.eventId, accepted: false, reason: "วันที่ไม่ถูกต้อง" };
  }
  const terms = await prisma.term.findMany({
    where: { isDeleted: false }, orderBy: { startDate: "desc" },
    select: { id: true, startDate: true, endDate: true },
  });
  const term = terms.find((row) => row.startDate.toISOString().slice(0, 10) <= event.localDate &&
    row.endDate.toISOString().slice(0, 10) >= event.localDate);
  if (!term) return { eventId: event.eventId, accepted: false, reason: "วันที่นี้ไม่อยู่ในภาคเรียน" };
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: student.id, termId: term.id, status: "ACTIVE", isDeleted: false }, select: { id: true },
  });
  if (!enrollment) return { eventId: event.eventId, accepted: false, reason: "นักเรียนไม่ได้ลงทะเบียนในภาคเรียนนี้" };

  const setting = await getScanSetting();
  const localTime = timeFormatter.format(capturedAt);
  if (localTime < setting.scanStartTime) {
    return { eventId: event.eventId, accepted: false, reason: "สแกนก่อนเวลาเปิดจุดสแกน" };
  }
  const isLate = localTime >= setting.lateAfterTime;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.scannerSyncEvent.create({
          data: { eventId: event.eventId, deviceId, studentId: student.id, capturedAt, result: "received" },
        });
        const entry = await tx.schoolEntry.upsert({
          where: { studentId_date: { studentId: student.id, date } },
          update: {}, create: { studentId: student.id, termId: term.id, date, method: "FACE" },
          select: { id: true, isDeleted: true, checkInAt: true },
        });
        if (entry.isDeleted) {
          await tx.scannerSyncEvent.update({ where: { eventId: event.eventId }, data: { result: "rejected" } });
          return "rejected" as const;
        }
        const changed = await tx.schoolEntry.updateMany({
          where: { id: entry.id, isDeleted: false, checkInAt: null },
          data: { checkInAt: capturedAt, isLate, method: "FACE" },
        });
        const status = changed.count ? "checked_in" : "already";
        await tx.scannerSyncEvent.update({ where: { eventId: event.eventId }, data: { result: status } });
        if (changed.count) {
          await syncLateBehaviorPoints(tx, term.id, student.id, date, isLate);
          await tx.auditLog.create({
            data: { action: "scanner.offline.checkin", targetType: "student", targetId: student.id,
              detail: `สแกนเมื่อ ${event.localDate} ${localTime} · เครื่อง ${deviceId}` },
          });
        }
        return status;
      });
      if (result === "rejected") {
        return { eventId: event.eventId, accepted: false, reason: "รายการเช็กชื่อนี้ถูกยกเลิกในระบบ" };
      }
      if (result === "checked_in" && event.localDate === dateFormatter.format(now)) {
        const name = [student.prefix, student.firstName, student.lastName].filter(Boolean).join(" ");
        const message = `${name} เข้าโรงเรียนแล้วเมื่อเวลา ${localTime} น.${isLate ? " (มาสาย)" : ""}`;
        void notifyGuardiansOfCheckIn(student.id, name, localTime, message).catch(() => undefined);
      }
      return { eventId: event.eventId, accepted: true, result };
    } catch (error) {
      if (!isRetryable(error) || attempt === 1) throw error;
      const prior = await prisma.scannerSyncEvent.findUnique({
        where: { eventId: event.eventId }, select: { deviceId: true, studentId: true, result: true },
      });
      if (prior) {
        return prior.deviceId === deviceId && prior.studentId === student.id
          ? prior.result === "rejected"
            ? { eventId: event.eventId, accepted: false, reason: "รายการเช็กชื่อนี้ถูกยกเลิกในระบบ" }
            : { eventId: event.eventId, accepted: true, result: "already" }
          : { eventId: event.eventId, accepted: false, reason: "รหัสรายการนี้ถูกใช้กับข้อมูลอื่นแล้ว" };
      }
    }
  }
  throw new Error("scanner sync retry exhausted");
}

export async function processScannerBatch(deviceId: string, events: ScannerEvent[]) {
  const outcomes: ScannerEventOutcome[] = [];
  for (const event of events) outcomes.push(await processOne(deviceId, event));
  return {
    accepted: outcomes.filter((row): row is Extract<ScannerEventOutcome, { accepted: true }> => row.accepted)
      .map((row) => row.eventId),
    rejected: outcomes.filter((row): row is Extract<ScannerEventOutcome, { accepted: false }> => !row.accepted)
      .map(({ eventId, reason }) => ({ eventId, reason })),
  };
}
