"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireRoles } from "@/lib/dal";
import { generateAdvisorLinkCode } from "@/features/line/services/line-service";
import { logAudit } from "@/lib/audit";

export async function generateAdvisorLineCodeAction(staffId: string): Promise<{ ok: boolean; message: string; code?: string }> {
  const user = await requireRoles(["ADMIN"]);
  try {
    if (!staffId) return { ok: false, message: "ไม่พบครูที่เลือก" };
    const result = await generateAdvisorLinkCode(staffId);
    if (result.ok) {
      await logAudit({ actorId: user.id, action: "line.teacher_code.create", targetType: "staff", targetId: staffId });
      revalidatePath("/dashboard/line/teachers");
      revalidatePath("/dashboard/my-line");
    }
    return { ...result, message: result.ok ? "สร้างรหัสให้ครูแล้ว" : result.message ?? "สร้างรหัสไม่ได้" };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[generateAdvisorLineCodeAction]", error);
    return { ok: false, message: "สร้างรหัสให้ครูไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
}
