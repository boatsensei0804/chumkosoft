"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireRoles } from "@/lib/dal";
import { createAndSendLineAnnouncement, deliverLineAnnouncement, type AnnouncementInput, type AnnouncementResult } from "@/features/line/services/line-announcements";

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
