import "server-only";
import prisma from "@/lib/prisma";
import type { CurrentUser } from "@/lib/dal";
export interface LineDeliveryState { enabled: boolean; available: boolean; updatedAt: string | null }

/** Read each send, so a pause applies to all workers without waiting for a cache. */
export async function getLineDeliveryState(): Promise<LineDeliveryState> {
  try {
    const row = await prisma.lineDeliverySetting.findUnique({ where: { id: 1 }, select: { pushEnabled: true, updatedAt: true } });
    // Existing installations retain their behavior until an admin changes it.
    return { enabled: row?.pushEnabled ?? true, available: true, updatedAt: row?.updatedAt.toISOString() ?? null };
  } catch {
    console.error("[LINE delivery] Cannot read delivery switch; outbound messages paused");
    return { enabled: false, available: false, updatedAt: null };
  }
}
export async function isLinePushEnabled(): Promise<boolean> {
  const state = await getLineDeliveryState();
  return state.available && state.enabled;
}
export async function setLinePushEnabled(value: boolean, user: CurrentUser): Promise<LineDeliveryState> {
  if (user.role !== "ADMIN") throw new Error("Forbidden");
  if (typeof value !== "boolean") throw new Error("Invalid delivery state");
  const row = await prisma.$transaction(async tx => {
    const setting = await tx.lineDeliverySetting.upsert({ where: { id: 1 }, create: { id: 1, pushEnabled: value, updatedByUserId: user.id }, update: { pushEnabled: value, updatedByUserId: user.id }, select: { pushEnabled: true, updatedAt: true } });
    await tx.auditLog.create({ data: { actorId: user.id, action: value ? "line.delivery.resume" : "line.delivery.pause", targetType: "lineDeliverySetting", targetId: "1", detail: "Controls outbound push/multicast only; replies stay available" } });
    return setting;
  });
  return { enabled: row.pushEnabled, available: true, updatedAt: row.updatedAt.toISOString() };
}
