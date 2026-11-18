"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import prisma from "@/lib/prisma";
import { retryFailedLineDelivery } from "@/features/line/services/message-api-summary";

export async function retryEmergencyMessageAction(id: string) {
  await requireRoles(["ADMIN", "TEACHER"]);
  const row = await prisma.lineOutboundMessage.findUnique({ where: { id }, select: { kind: true, emergencyIncidentId: true } });
  if (!row || row.kind !== "EMERGENCY" || !row.emergencyIncidentId) {
    return { ok: false, message: "ไม่พบรายการแจ้งเหตุฉุกเฉินนี้" };
  }
  const result = await retryFailedLineDelivery(id);
  revalidatePath("/dashboard/emergencies");
  return result;
}
