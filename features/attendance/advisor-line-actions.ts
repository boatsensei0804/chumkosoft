"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { generateAdvisorLinkCode } from "@/features/line/services/line-service";

export async function createMyAdvisorLineCode(): Promise<{ ok: boolean; code?: string; message?: string }> {
  const user = await getCurrentUser();
  if (user.role !== "TEACHER" || !user.staffId) return { ok: false, message: "ต้องใช้บัญชีครูที่ผูกกับข้อมูลบุคลากร" };
  const result = await generateAdvisorLinkCode(user.staffId);
  if (result.ok) revalidatePath("/dashboard/attendance");
  return result;
}
