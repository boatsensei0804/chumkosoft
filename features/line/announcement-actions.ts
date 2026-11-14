"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireRoles } from "@/lib/dal";
import { createAndSendLineAnnouncement, deliverLineAnnouncement, deleteLineAnnouncement, type AnnouncementInput, type AnnouncementResult } from "@/features/line/services/line-announcements";

const PATH = "/dashboard/line-announcements";

export async function sendLineAnnouncementAction(input: AnnouncementInput): Promise<AnnouncementResult> {
  const user = await requireRoles(["ADMIN"]);
  try {
    const result = await createAndSendLineAnnouncement(input, user.id);
    revalidatePath(PATH);
    return result;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[sendLineAnnouncementAction]", error);
    return { ok: false, message: "ส่งประกาศไม่สำเร็จ กรุณาตรวจรายการส่งก่อนลองอีกครั้ง" };
  }
}

export async function retryLineAnnouncementAction(id: string): Promise<AnnouncementResult> {
  const user = await requireRoles(["ADMIN"]);
  try {
    const result = await deliverLineAnnouncement(id, user.id);
    revalidatePath(PATH);
    return result;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[retryLineAnnouncementAction]", error);
    return { ok: false, message: "ส่งต่อไม่สำเร็จ กรุณาตรวจรายการส่งก่อนลองอีกครั้ง" };
  }
}

export async function previewLineAudienceAction(audience: unknown): Promise<{ ok: boolean; message?: string; count: number; fingerprint: string; labels: string[] }> {
  await requireRoles(["ADMIN"]);
  try {
    const { resolveAnnouncementAudience } = await import("@/features/line/services/announcement-audience-service");
    const result = await resolveAnnouncementAudience(audience);
    return { ok: true, count: result.recipients.length, fingerprint: result.fingerprint, labels: result.labels };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: "ตรวจผู้รับไม่สำเร็จ กรุณาโหลดหน้าใหม่และเลือกผู้รับอีกครั้ง", count: 0, fingerprint: "", labels: [] };
  }
}

export async function deleteLineAnnouncementAction(id: string): Promise<AnnouncementResult> {
  const user = await requireRoles(["ADMIN"]);
  try {
    const result = await deleteLineAnnouncement(id, user.id);
    if (result.ok) revalidatePath(PATH);
    return result;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[deleteLineAnnouncementAction]", error);
    return { ok: false, message: "ลบประกาศไม่สำเร็จ กรุณาลองใหม่" };
  }
}
