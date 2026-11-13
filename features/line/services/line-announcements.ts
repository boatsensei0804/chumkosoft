import "server-only";

import { randomUUID } from "node:crypto";
import type { LineAnnouncementKind } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isLineConfigured, sendLineTextToUsers } from "@/lib/line";
import { logAudit } from "@/lib/audit";
import { announcementText } from "@/features/line/announcement-text";

const BATCH_SIZE = 500;

export interface AnnouncementInput {
  requestKey: string;
  kind: LineAnnouncementKind;
  title: string;
  body: string;
  expectedRecipients: number;
}

export interface AnnouncementResult {
  ok: boolean;
  message: string;
  id?: string;
  accepted?: number;
  remaining?: number;
}

/** The user ID list is never sent to the browser. One LINE account may appear
 * under several students or as both a guardian and a teacher. */
async function linkedLineUserIds(): Promise<string[]> {
  const [guardians, studentAccounts, staff] = await Promise.all([
    prisma.guardian.findMany({ where: { isDeleted: false, student: { isDeleted: false }, lineUserId: { not: null } }, select: { lineUserId: true } }),
    prisma.studentLineAccount.findMany({ where: { student: { isDeleted: false }, lineUserId: { not: null } }, select: { lineUserId: true } }),
    prisma.staff.findMany({ where: { isDeleted: false, lineUserId: { not: null } }, select: { lineUserId: true } }),
  ]);
  return [...new Set([...guardians, ...studentAccounts, ...staff].flatMap((row) => row.lineUserId ? [row.lineUserId] : []))].sort();
}

export async function getLinkedLineRecipientCount(): Promise<number> {
  return (await linkedLineUserIds()).length;
}

export async function listLineAnnouncements() {
  return prisma.lineAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, kind: true, title: true, recipientCount: true, createdAt: true,
      batches: { select: { id: true, status: true, recipientCount: true, errorCode: true } },
    },
  });
}

export async function createAndSendLineAnnouncement(input: AnnouncementInput, actorId: string): Promise<AnnouncementResult> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(input.requestKey) ||
      !["NEWS", "EMERGENCY"].includes(input.kind) ||
      title.length < 1 || title.length > 120 || body.length < 1 || body.length > 3000 ||
      announcementText(input.kind, title, body).length > 5000) {
    return { ok: false, message: "กรุณาตรวจสอบประเภท หัวข้อ และเนื้อหาประกาศ" };
  }
  if (!isLineConfigured()) return { ok: false, message: "ยังไม่ได้ตั้งค่า LINE Channel access token บนเซิร์ฟเวอร์" };

  const existing = await prisma.lineAnnouncement.findUnique({ where: { requestKey: input.requestKey }, select: { id: true, kind: true, title: true, body: true } });
  if (existing) {
    if (existing.kind !== input.kind || existing.title !== title || existing.body !== body) {
      return { ok: false, message: "ข้อความประกาศเปลี่ยนไป กรุณาตรวจรายการส่งเดิมก่อนสร้างประกาศใหม่" };
    }
    return deliverLineAnnouncement(existing.id, actorId);
  }

  const recipients = await linkedLineUserIds();
  if (recipients.length === 0) return { ok: false, message: "ยังไม่มีบัญชี LINE ที่เชื่อมกับนักเรียนหรือครู" };
  if (recipients.length !== input.expectedRecipients) {
    return { ok: false, message: "จำนวนผู้รับเปลี่ยนไป กรุณาโหลดหน้านี้ใหม่เพื่อตรวจจำนวนก่อนส่ง" };
  }
  const chunks = Array.from({ length: Math.ceil(recipients.length / BATCH_SIZE) }, (_, index) => recipients.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
  const announcement = await prisma.lineAnnouncement.create({
    data: {
      requestKey: input.requestKey,
      kind: input.kind,
      title,
      body,
      recipientCount: recipients.length,
      createdById: actorId,
      batches: { create: chunks.map((to, batchNumber) => ({ batchNumber, recipients: to, recipientCount: to.length, retryKey: randomUUID() })) },
    },
    select: { id: true },
  });
  await logAudit({ actorId, action: "line.announcement.create", targetType: "lineAnnouncement", targetId: announcement.id, detail: `${input.kind} · ${recipients.length} recipients` });
  return deliverLineAnnouncement(announcement.id, actorId);
}

export async function deliverLineAnnouncement(id: string, actorId: string): Promise<AnnouncementResult> {
  if (!isLineConfigured()) return { ok: false, message: "ยังไม่ได้ตั้งค่า LINE Channel access token บนเซิร์ฟเวอร์" };
  const announcement = await prisma.lineAnnouncement.findUnique({
    where: { id },
    include: { batches: { orderBy: { batchNumber: "asc" } } },
  });
  if (!announcement) return { ok: false, message: "ไม่พบประกาศนี้" };
  const text = announcementText(announcement.kind, announcement.title, announcement.body);
  for (const batch of announcement.batches) {
    if (batch.status === "ACCEPTED") continue;
    const recipients = Array.isArray(batch.recipients) ? batch.recipients.filter((value): value is string => typeof value === "string") : [];
    const result = await sendLineTextToUsers(recipients, text, batch.retryKey);
    await prisma.lineAnnouncementBatch.update({
      where: { id: batch.id },
      data: { status: result.accepted ? "ACCEPTED" : "FAILED", errorCode: result.accepted ? null : result.code },
    });
    // Stop at the first error so a quota or token failure does not spam LINE.
    if (!result.accepted) break;
  }
  const latest = await prisma.lineAnnouncementBatch.findMany({ where: { announcementId: id }, select: { status: true, recipientCount: true } });
  const accepted = latest.filter((batch) => batch.status === "ACCEPTED").reduce((sum, batch) => sum + batch.recipientCount, 0);
  const remaining = announcement.recipientCount - accepted;
  await logAudit({ actorId, action: "line.announcement.send", targetType: "lineAnnouncement", targetId: id, detail: `accepted ${accepted}/${announcement.recipientCount}` });
  return {
    ok: remaining === 0,
    id,
    accepted,
    remaining,
    message: remaining === 0 ? `LINE รับคำขอส่งถึง ${accepted} บัญชีแล้ว` : `LINE รับคำขอส่งแล้ว ${accepted} บัญชี ยังไม่สำเร็จ ${remaining} บัญชี ตรวจรายการและลองส่งต่อได้`,
  };
}
