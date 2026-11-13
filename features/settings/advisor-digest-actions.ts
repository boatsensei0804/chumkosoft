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

export async function saveLineOaFriendUrl(value: string): Promise<{ ok: boolean; message: string }> {
  await requireRoles(["ADMIN"]);
  const normalized = value.trim();
  if (normalized) {
    try {
      const url = new URL(normalized);
      if (url.protocol !== "https:" || !["lin.ee", "line.me", "page.line.me"].includes(url.hostname) || normalized.length > 500) {
        return { ok: false, message: "ใส่ลิงก์เพิ่มเพื่อน LINE OA ที่ขึ้นต้นด้วย https://lin.ee/ หรือ https://line.me/" };
      }
    } catch {
      return { ok: false, message: "ลิงก์เพิ่มเพื่อน LINE OA ไม่ถูกต้อง" };
    }
  }
  await prisma.advisorDigestSetting.upsert({ where: { id: 1 }, create: { id: 1, oaAddFriendUrl: normalized || null }, update: { oaAddFriendUrl: normalized || null } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/my-line");
  return { ok: true, message: normalized ? "บันทึกลิงก์เพิ่มเพื่อน LINE OA แล้ว" : "นำลิงก์เพิ่มเพื่อน LINE OA ออกแล้ว" };
}
