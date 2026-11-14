"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireRoles } from "@/lib/dal";
import { addManualBehaviorPoints, updateManualBehaviorPoints, deleteManualBehaviorPoints } from "@/features/behavior/services/behavior-service";

export async function addBehaviorPointsAction(input: { studentId: string; direction: "ADD" | "DEDUCT"; points: number; title: string; note: string; requestId: string }): Promise<{ ok: boolean; message: string }> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  try {
    const result = await addManualBehaviorPoints(input, user);
    if (result.ok) revalidatePath("/dashboard/behavior");
    return result;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[addBehaviorPointsAction]", error);
    return { ok: false, message: "บันทึกคะแนนไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function updateBehaviorPointsAction(input: { id: string; direction: "ADD" | "DEDUCT"; points: number; title: string; note: string }): Promise<{ ok: boolean; message: string }> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  try {
    const result = await updateManualBehaviorPoints(input, user);
    if (result.ok) revalidatePath("/dashboard/behavior");
    return result;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[updateBehaviorPointsAction]", error);
    return { ok: false, message: "แก้ไขคะแนนไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function deleteBehaviorPointsAction(id: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  try {
    const result = await deleteManualBehaviorPoints(id, user);
    if (result.ok) revalidatePath("/dashboard/behavior");
    return result;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[deleteBehaviorPointsAction]", error);
    return { ok: false, message: "ลบรายการคะแนนไม่สำเร็จ กรุณาลองใหม่" };
  }
}
