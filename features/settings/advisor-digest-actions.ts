"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireRoles } from "@/lib/dal";

export async function saveAdvisorDigestTime(value: string): Promise<{ ok: boolean; message: string }> {
  await requireRoles(["ADMIN"]);
  if (!/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(value)) {
    return { ok: false, message: "เลือกเวลาเป็นช่วงครึ่งชั่วโมง เช่น 09:00 หรือ 09:30" };
  }
  await prisma.advisorDigestSetting.upsert({ where: { id: 1 }, create: { id: 1, sendTime: value }, update: { sendTime: value } });
  revalidatePath("/dashboard/settings");
  return { ok: true, message: `บันทึกเวลาส่งสรุป ${value} น. แล้ว` };
}
