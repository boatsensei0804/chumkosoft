"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireRoles } from "@/lib/dal";
import { reviewLeaveRequest, retryLeaveAdvisorNotification } from "@/features/leave/services/leave-review-service";

export async function reviewLeaveRequestAction(id: string, decision: "APPROVED" | "REJECTED", note: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  try {
    if (decision !== "APPROVED" && decision !== "REJECTED") return { ok: false, message: "ผลการพิจารณาไม่ถูกต้อง" };
    const result = await reviewLeaveRequest(id, decision, note, user);
    if (result.ok) revalidatePath("/dashboard/leave-requests");
    return result;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[reviewLeaveRequestAction]", error);
    return { ok: false, message: "บันทึกผลคำขอลาไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function retryLeaveAdvisorNotificationAction(id: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireRoles(["ADMIN"]);
  try {
    const result = await retryLeaveAdvisorNotification(id, user);
    revalidatePath("/dashboard/leave-requests");
    return result;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[retryLeaveAdvisorNotificationAction]", error);
    return { ok: false, message: "ส่งแจ้งเตือนซ้ำไม่สำเร็จ" };
  }
}
