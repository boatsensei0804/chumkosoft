"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { generateLinkCode, unlinkGuardianLine } from "@/features/line/services/line-service";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const LINE_PATH = "/dashboard/guardians";

export async function generateLinkCodeAction(guardianId: string): Promise<ActionResult & { code?: string }> {
  try {
    await requireRoles(STAFF_ROLES);
    const result = await generateLinkCode(guardianId);
    if (result.ok) revalidatePath(LINE_PATH);
    return result;
  } catch (error) {
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(error);
    console.error("[generateLinkCodeAction]", error);
    return { ok: false, message: "สร้างรหัสไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function unlinkGuardianAction(guardianId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);
    const result = await unlinkGuardianLine(guardianId);
    if (result.ok) revalidatePath(LINE_PATH);
    return result;
  });
}
